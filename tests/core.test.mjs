import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import Core, {
  makeSDF,
  fresnel,
  profile,
  heightFn,
} from "../src/core/index.ts";
import { QUALITY_PRESETS } from "../src/quality.ts";

const gold = JSON.parse(
  fs.readFileSync(new URL("./golden/math.json", import.meta.url), "utf8"),
);
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
test("Balanced defaults and explicit Reference preserve their separate contracts", () => {
  assert.deepEqual(QUALITY_PRESETS.Reference, gold.defaults);
  assert.ok(Object.isFrozen(QUALITY_PRESETS.Reference));
  assert.deepEqual(QUALITY_PRESETS.Balanced, {dispersion: 0.8, sat: 1, edge: 0, rim: 0.80});
  assert.deepEqual(QUALITY_PRESETS.Fast, {dispersion: 0, sat: 1, edge: 0, rim: 0.80});
  assert.deepEqual(Core.DEFAULTS, {...gold.defaults, ...QUALITY_PRESETS.Balanced});
  assert.deepEqual(Object.keys(Core).sort(), [
    "DEFAULTS",
    "attach",
    "detach",
    "force",
    "info",
    "refresh",
    "setOpts",
    "supported",
    "unwatch",
    "version",
    "watch",
  ]);
  assert.equal(Core.DEFAULTS.bevel, 37);
  assert.equal(Core.DEFAULTS.thickness, 59);
});
test("SDF, Fresnel and Snell match frozen b257c17 values for all bevel shapes", () => {
  for (const { r, x, y, value } of gold.sdf)
    assert.equal(makeSDF(300, 180, r)(x, y), value);
  for (const { a, value } of gold.fresnel) assert.equal(fresnel(a), value);
  assert.equal(fresnel(0), 0.04);
  for (const { shape, d, disp, alpha } of gold.snell)
    assert.deepEqual(profile(d, 37, 59, heightFn(shape)), { disp, alpha });
});
