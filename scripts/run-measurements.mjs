import { spawn } from "node:child_process";
for (const args of [
  ["scripts/benchmark.mjs", "--label", "before"],
  ["scripts/benchmark.mjs", "--label", "after"],
  ["scripts/compare-quality.mjs"],
  ["scripts/profile-image.mjs"],
]) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${args[0]} failed: ${code}`)),
    );
  });
}
