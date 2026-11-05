import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
  existsSync,
} from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { chromium } from "@playwright/test";
import { verifyConsumerBrowser } from "../tests/consumer-checks.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const sourcePackage = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const sourceLock = JSON.parse(
  readFileSync(join(root, "package-lock.json"), "utf8"),
);
assert.equal(sourceLock.version, sourcePackage.version);
assert.equal(sourceLock.packages[""].version, sourcePackage.version);
const directory = mkdtempSync(join(tmpdir(), "liquid-glass-consumer-"));
const npm = process.env.npm_execpath;
if (!npm) throw Error("Run through npm run test:consumer");
function run(args, cwd = directory) {
  const r = spawnSync(process.execPath, [npm, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) throw Error(r.stdout + "\n" + r.stderr);
  return r.stdout;
}
const packed = JSON.parse(
  run(
    ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
    root,
  ),
)[0];
const dryRun = JSON.parse(
  run(["pack", "--dry-run", "--ignore-scripts", "--json"], root),
)[0];
const fileNames = (p) => p.files.map((f) => f.path).sort();
assert.deepEqual(
  fileNames(packed),
  fileNames(dryRun),
  "Dry-run and real tarball contents agree",
);
const packageDocs = new Set([
  "package.json",
  "README.md",
  "README.zh-CN.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "licenses/Hyalite-MIT.txt",
]);
for (const { path } of packed.files) {
  assert.ok(
    packageDocs.has(path) ||
      /^dist\/(?:[a-z-]+\/)*[a-z-]+\.(?:js|d\.ts)$/.test(path) ||
      path === "dist/styles.css",
    `Unexpected package file: ${path}`,
  );
}
for (const path of packageDocs)
  assert.ok(fileNames(packed).includes(path), `Missing ${path}`);
assert.equal(packed.name, "@librecosta/liquid-glass");
assert.equal(packed.version, sourcePackage.version);
// A real default npm install of only the core must not pull in React or tools.
const coreOnly = join(directory, "core-only");
mkdirSync(coreOnly);
writeFileSync(
  join(coreOnly, "package.json"),
  JSON.stringify({
    private: true,
    type: "module",
    dependencies: { "@librecosta/liquid-glass": `file:../${packed.filename}` },
  }),
);
run(
  [
    "install",
    "--registry=https://registry.npmjs.org",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  coreOnly,
);
const coreLock = JSON.parse(
  readFileSync(join(coreOnly, "package-lock.json"), "utf8"),
);
assert.deepEqual(Object.keys(coreLock.packages).sort(), [
  "",
  "node_modules/@librecosta/liquid-glass",
]);
for (const name of ["react", "react-dom", "@playwright", "vite"])
  assert.equal(
    existsSync(join(coreOnly, "node_modules", name)),
    false,
    `Unexpected core dependency: ${name}`,
  );
writeFileSync(
  join(coreOnly, "core.ts"),
  `import { createLiquidGlass, QUALITY_PRESETS, type LiquidGlassInstance } from '@librecosta/liquid-glass';
export function bind(element: HTMLElement): LiquidGlassInstance {
  const glass = createLiquidGlass(element);
  glass.setOptions(QUALITY_PRESETS.Fast);
  glass.setOptions(QUALITY_PRESETS.Balanced);
  return glass;
}`,
);
writeFileSync(
  join(coreOnly, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      types: [],
    },
    include: ["core.ts"],
  }),
);
const coreTypes = spawnSync(
  process.execPath,
  [join(root, "node_modules/typescript/bin/tsc"), "-p", coreOnly],
  { encoding: "utf8", windowsHide: true },
);
assert.equal(coreTypes.status, 0, coreTypes.stdout + coreTypes.stderr);
const coreSSR = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
for (const key of ['window','document','navigator','CSS','ResizeObserver','MutationObserver'])
 Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('browser read: '+key)}});
const core=await import('@librecosta/liquid-glass');
if(JSON.stringify(Object.keys(core).sort())!==JSON.stringify(['DEFAULTS','QUALITY_PRESETS','createLiquidGlass','supported'])) throw Error('Core exports');
`,
  ],
  { cwd: coreOnly, encoding: "utf8", windowsHide: true },
);
assert.equal(coreSSR.status, 0, coreSSR.stderr);
console.log(
  `Tarball ${packed.filename}: ${packed.files.length} allowlisted files, ${packed.size} bytes; core-only install/types/SSR without React passed`,
);
cpSync(resolve(root, "tests/consumer"), directory, { recursive: true });
// Compile the actual bilingual Quick Starts against the installed package.
const readmeExamples = [];
for (const [file, language] of [
  ["README.md", "en"],
  ["README.zh-CN.md", "zh-CN"],
]) {
  const blocks = [
    ...readFileSync(join(root, file), "utf8").matchAll(
      /^```(ts|tsx)\r?\n([\s\S]*?)^```/gm,
    ),
  ];
  assert.ok(
    blocks.some((b) => b[1] === "ts") && blocks.some((b) => b[1] === "tsx"),
    `${file}: core and Hook Quick Starts`,
  );
  for (const [i, block] of blocks.entries()) {
    const name = `readme-${language}-${i}.${block[1]}`;
    writeFileSync(join(directory, "src", name), block[2]);
    readmeExamples.push(name);
  }
}
const pkgPath = join(directory, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.dependencies["@librecosta/liquid-glass"] = "file:./" + packed.filename;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log("Independent tarball consumer: " + directory);
run([
  "install",
  "--prefer-offline",
  "--registry=https://registry.npmjs.org",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
]);
console.log(run(["run", "build"]));
const installed = join(directory, "node_modules/@librecosta/liquid-glass");
const installedPackage = JSON.parse(
  readFileSync(join(installed, "package.json"), "utf8"),
);
assert.equal(installedPackage.version, sourcePackage.version);
assert.equal(
  installedPackage.private,
  sourcePackage.private,
  "Publish lock matches reviewed source",
);
assert.deepEqual(installedPackage.peerDependencies, { react: "^19.0.0" });
assert.deepEqual(installedPackage.peerDependenciesMeta, {
  react: { optional: true },
});
assert.equal(
  installedPackage.engines,
  undefined,
  "Node 24 is a development gate, not an asserted browser runtime requirement",
);
assert.equal(installedPackage.publishConfig.access, "public");
assert.equal(installedPackage.license, "MIT");
for (const path of [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "licenses/Hyalite-MIT.txt",
])
  assert.deepEqual(
    readFileSync(join(installed, path)),
    readFileSync(join(root, path)),
    `Installed license: ${path}`,
  );
assert.deepEqual(Object.keys(installedPackage.exports).sort(), [
  ".",
  "./react",
  "./styles.css",
]);
for (const value of Object.values(installedPackage.exports))
  for (const path of typeof value === "string" ? [value] : Object.values(value))
    assert.ok(
      existsSync(join(installed, path)),
      `Export target exists: ${path}`,
    );
if (!realpathSync(installed).startsWith(realpathSync(directory)))
  throw Error("Package resolved outside consumer");
const fromConsumer = createRequire(pkgPath),
  fromPackage = createRequire(join(installed, "package.json"));
if (fromConsumer.resolve("react") !== fromPackage.resolve("react"))
  throw Error("Duplicate React");
const ssr = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
for(const key of ['window','document','navigator','CSS','ResizeObserver','MutationObserver'])
 Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('browser read: '+key)}});
const core=await import('@librecosta/liquid-glass');const react=await import('@librecosta/liquid-glass/react');
if(JSON.stringify(Object.keys(react).sort())!==JSON.stringify(['useLiquidGlass']))throw Error('React public exports');
if(JSON.stringify(Object.keys(core).sort())!==JSON.stringify(['DEFAULTS','QUALITY_PRESETS','createLiquidGlass','supported']))throw Error('Core public exports');
for(const key of ['window','document','navigator','CSS','ResizeObserver','MutationObserver'])delete globalThis[key];
const {renderToString}=await import('react-dom/server');const {createElement:h}=await import('react');
function OwnDOM(){const card=react.useLiquidGlass(),button=react.useLiquidGlass(),surface=react.useLiquidGlass();return h('div',{ref:card.ref},h('button',{ref:button.ref,type:'submit'},'Save'),h('span',null,h('span',{ref:surface.ref,'aria-hidden':true}),h('input',{name:'email',type:'email'})));}
const html=renderToString(h(OwnDOM));
if(!html.includes('<button')||!html.includes('<input')||html.includes('<svg'))throw Error('SSR markup');
console.log('Packed core/react SSR imports and server rendering passed');
`,
  ],
  { cwd: directory, encoding: "utf8", windowsHide: true },
);
if (ssr.status !== 0) throw Error(ssr.stderr);
console.log(ssr.stdout.trim());
async function startServer(preview) {
  const port = await new Promise((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
  const server = spawn(
    process.execPath,
    [
      join(directory, "node_modules/vite/bin/vite.js"),
      ...(preview ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: directory, stdio: "pipe", windowsHide: true },
  );
  let logs = "";
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return { server, url };
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  server.kill();
  throw Error(logs);
}
const browser = await chromium.launch(
  process.env.LG_CHROME
    ? { executablePath: process.env.LG_CHROME }
    : process.env.LG_BROWSER === "chromium"
      ? {}
      : { channel: "chrome" },
);
const phases = [];
try {
  for (const preview of [false, true]) {
    const { server, url } = await startServer(preview);
    try {
      phases.push(
        await verifyConsumerBrowser(browser, url, { strictMode: !preview }),
      );
    } finally {
      server.kill();
    }
  }
  mkdirSync(resolve(root, "test-results"), { recursive: true });
  writeFileSync(
    resolve(root, "test-results/consumer.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        directory,
        tarball: packed.filename,
        version: packed.version,
        bytes: packed.size,
        integrity: packed.integrity,
        coreWithoutReact: true,
        readmeExamples,
        files: packed.files.map((f) => f.path),
        phases,
      },
      null,
      2,
    ),
  );
  console.log(
    "Packed consumer: typecheck/build, SSR, dev StrictMode + production, native forms, refs, lifecycle and fallback passed",
  );
} finally {
  await browser.close();
}
