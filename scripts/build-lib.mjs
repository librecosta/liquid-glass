import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
if (dirname(output) !== resolve(root))
  throw new Error("Invalid library output directory");
rmSync(output, { recursive: true, force: true });
execFileSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.lib.json"],
  { stdio: "inherit" },
);
mkdirSync("dist", { recursive: true });
copyFileSync("src/styles.css", "dist/styles.css");
copyFileSync("src/materials.css", "dist/materials.css");
