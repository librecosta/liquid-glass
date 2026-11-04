import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import Core, {
  makeSDF,
  fresnel,
  profile,
  heightFn,
} from "../src/core/index.ts";

const reference = new URL("../reference/hyalite-v0.5.0/", import.meta.url);
test("frozen upstream files match the pinned manifest byte for byte", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("UPSTREAM.json", reference)),
  );
  assert.equal(manifest.commit, "3c7eb86d7457b437013c5e9579e9c2d6fe713f2d");
  for (const [file, expected] of Object.entries(manifest.sha256)) {
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(new URL(file, reference)))
        .digest("hex"),
      expected,
      file,
    );
  }
});
test("SSR import never reads browser globals or installs a global API", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    for (const key of ['window', 'document', 'navigator', 'CSS', 'ResizeObserver', 'MutationObserver'])
      Object.defineProperty(globalThis, key, { get() { throw Error('read ' + key); }, configurable: true });
    const { default: core } = await import('./src/core/index.ts');
    if (core.version !== '0.5.0' || globalThis.Hyalite) process.exit(1);
  `,
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
});
test("public defaults and API names match 0.5.0", () => {
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(new URL("hyalite.js", reference), "utf8"),
    context,
  );
  assert.deepEqual(
    Core.DEFAULTS,
    JSON.parse(JSON.stringify(context.Hyalite.DEFAULTS)),
  );
  assert.deepEqual(
    Object.keys(Core).sort(),
    Object.keys(context.Hyalite).sort(),
  );
  assert.equal(Core.DEFAULTS.bevel, 37);
  assert.equal(Core.DEFAULTS.thickness, 59);
});
test("SDF, Fresnel and Snell profiles agree with upstream over all shapes", () => {
  const context = vm.createContext({});
  const source = fs
    .readFileSync(new URL("hyalite.js", reference), "utf8")
    .replace(
      "  const API =",
      "  root.math = {makeSDF, fresnel, profile, heightFn};\n  const API =",
    );
  vm.runInContext(source, context);
  for (const radii of [
    [0, 0, 0, 0],
    [50, 50, 50, 50],
    [48, 12, 64, 4],
  ]) {
    const ours = makeSDF(300, 180, radii),
      theirs = context.math.makeSDF(300, 180, radii);
    for (let x = -20; x < 320; x += 7.5)
      for (let y = -20; y < 200; y += 9.5)
        assert.equal(ours(x, y), theirs(x, y));
  }
  for (let a = -1.57; a < 1.57; a += 0.01)
    assert.equal(fresnel(a), context.math.fresnel(a));
  assert.equal(fresnel(0), 0.04);
  for (const shape of ["circle", "squircle", "lip"])
    for (let d = 0; d <= 37; d += 0.25) {
      const actual = profile(d, 37, 59, heightFn(shape)),
        expected = context.math.profile(
          d,
          37,
          59,
          context.math.heightFn(shape),
        );
      assert.equal(actual.disp, expected.disp);
      assert.equal(actual.alpha, expected.alpha);
    }
});
