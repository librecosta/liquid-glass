import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import { spawnSync } from "node:child_process";

// A historical checkout outside this repository, used only for BEFORE measurements.
const target = resolve(process.argv[2] || "../liquid-glass-lgc-before");
const fromRoot = relative(resolve("."), target);
if (
  !isAbsolute(fromRoot) &&
  fromRoot !== ".." &&
  !fromRoot.startsWith(".." + sep)
)
  throw Error("Historical worktree must be outside the current repository");
if (existsSync(target)) throw Error("Choose a new, empty worktree path");
const result = spawnSync(
  "git",
  [
    "worktree",
    "add",
    "--detach",
    target,
    "b257c17f448446729172b39991d85f293303c4ac",
  ],
  { encoding: "utf8", windowsHide: true },
);
if (result.status !== 0) throw Error(result.stderr);
mkdirSync(join(target, "src/assets"), { recursive: true });
copyFileSync("src/assets/forest.jpg", join(target, "src/assets/forest.jpg"));
const scene = join(target, "src/scene.ts");
writeFileSync(
  scene,
  'import forest from "./assets/forest.jpg";\n' +
    readFileSync(scene, "utf8")
      .replace('background: "stripes"', 'background: "image"')
      .replace('image: ""', "image: forest"),
);
const css = join(target, "src/frame.css");
writeFileSync(
  css,
  readFileSync(css, "utf8") +
    '\n.background-type{display:none}\n.scene.image::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.16);pointer-events:none;}\n',
);
console.log(
  "Historical checkout prepared at " +
    target +
    "\nRun npm ci and build there; serve dev on 5174 and preview on 4174. No optical or scheduling code was changed.",
);
