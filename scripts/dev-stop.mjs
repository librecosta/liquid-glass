import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("npm run dev:stop [-- --port 5174]\nWindows only; stops verified Vite dev/preview processes from this checkout.");
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== "--port" || !/^\d+$/.test(args[1]) || +args[1] < 1 || +args[1] > 65535)) {
  console.error("Expected no arguments, or --port <1..65535>.");
  process.exit(1);
}
if (process.platform !== "win32") {
  console.error("dev:stop currently supports Windows PowerShell only; no processes were stopped.");
  process.exit(1);
}
const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-File",
  fileURLToPath(new URL("./dev-stop.ps1", import.meta.url)),
  ...(args.length ? ["-Port", args[1]] : [])], { stdio: "inherit", windowsHide: true });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
