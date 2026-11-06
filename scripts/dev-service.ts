// Local tooling only. A CLI path alone cannot prove a process's working root.
import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import { realpathSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

export function devService(): Plugin {
  const root = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
  function register(server: ViteDevServer | PreviewServer, mode: string) {
    if (process.platform !== "win32" || realpathSync(server.config.root) !== root) return;
    // Only ordinary Vite CLI servers qualify, never arbitrary Node API hosts.
    try {
      if (realpathSync(process.argv[1]) !== realpathSync(join(root, "node_modules/vite/bin/vite.js"))) return;
    } catch { return; }
    const identity = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $p=Get-Process -Id ${process.pid}; $c=Get-CimInstance Win32_Process -Filter 'ProcessId = ${process.pid}'; @{ticks=$p.StartTime.ToUniversalTime().Ticks.ToString(); command=$c.CommandLine} | ConvertTo-Json -Compress`],
    { encoding: "utf8", windowsHide: true, timeout: 10000 });
    if (identity.status !== 0) { console.warn("dev:stop registration unavailable; no process will be trusted automatically."); return; }
    try {
      const { ticks, command } = JSON.parse(identity.stdout);
      if (!ticks || !command) throw Error("Missing process identity");
      const directory = join(root, ".vite/dev-services");
      mkdirSync(directory, { recursive: true });
      const record = join(directory, `${process.pid}.json`);
      const save = () => {
        try {
          const address = server.httpServer?.address();
          if (!address || typeof address === "string") return;
          const data = { root, pid: process.pid, ticks, mode, port: address.port,
            commandHash: createHash("sha256").update(command, "utf8").digest("hex") };
          writeFileSync(`${record}.tmp`, JSON.stringify(data));
          renameSync(`${record}.tmp`, record);
        } catch (error) { console.warn(`dev:stop registration failed: ${String(error)}`); }
      };
      if (server.httpServer?.listening) save();
      else server.httpServer?.once("listening", save);
    } catch (error) { console.warn(`dev:stop registration failed: ${String(error)}`); }
  }
  return { name: "local-dev-service", configureServer: (server) => register(server, "dev"),
    configurePreviewServer: (server) => register(server, "preview") };
}
