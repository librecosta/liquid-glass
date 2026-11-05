import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { chromium } from "@playwright/test";
import { verifyConsumerBrowser } from "../tests/consumer-checks.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
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
if (
  packed.files.some(
    (f) =>
      /^(src|node_modules|dist-playground)\//.test(f.path) ||
      /forest|\.(jpg|png)$/.test(f.path),
  )
)
  throw Error("Unexpected package contents");
if (!packed.files.some((f) => f.path === "licenses/Hyalite-MIT.txt"))
  throw Error("Missing adapted-code MIT license");
cpSync(resolve(root, "tests/consumer"), directory, { recursive: true });
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
    : process.env.LG_BROWSER === "chromium" ? {} : { channel: "chrome" },
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
