import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

test("Windows dev:stop verifies ownership, port selection, preview, stale identity and idempotence", {
  skip: process.platform !== "win32" ? "Windows-only service integration; no cross-platform kill fallback" : false,
  timeout: 120000,
}, async () => {
  const source = resolve("."), children = [];
  function project() {
    const root = mkdtempSync(join(tmpdir(), "liquid glass-停服-"));
    mkdirSync(join(root, "scripts"));
    for (const file of ["dev-service.ts", "dev-stop.mjs", "dev-stop.ps1"])
      copyFileSync(join(source, "scripts", file), join(root, "scripts", file));
    copyFileSync(join(source, "vite.config.ts"), join(root, "vite.config.ts"));
    symlinkSync(join(source, "node_modules"), join(root, "node_modules"), "junction");
    writeFileSync(join(root, "package.json"), '{"type":"module"}');
    writeFileSync(join(root, "index.html"), "<p>Temporary service ownership test</p>");
    mkdirSync(join(root, "dist-playground"));
    writeFileSync(join(root, "dist-playground/index.html"), "<p>Preview ownership test</p>");
    return root;
  }
  async function freePort() {
    const server = createServer();
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const port = server.address().port;
    await new Promise((done) => server.close(done));
    return port;
  }
  async function up(root, preview = false, foreign = false) {
    const port = await freePort();
    const args = foreign ? ["-e", `require('http').createServer((q,s)=>s.end('foreign')).listen(${port},'127.0.0.1')`]
      : [join(root, "node_modules/vite/bin/vite.js"), ...(preview ? ["preview"] : []), "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
    const child = spawn(process.execPath, args, { cwd: root, stdio: "pipe", windowsHide: true });
    children.push(child);
    let logs = "";
    child.stdout.on("data", (b) => logs += b);
    child.stderr.on("data", (b) => logs += b);
    for (let i = 0; i < 150; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return { port, child }; } catch {}
      if (child.exitCode !== null) throw Error(logs);
      await new Promise((done) => setTimeout(done, 100));
    }
    throw Error(`Service did not start: ${logs}`);
  }
  function stop(root, port, expected = 0) {
    const r = spawnSync(process.execPath, [join(root, "scripts/dev-stop.mjs"), ...(port ? ["--port", String(port)] : [])], { cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(r.status, expected, r.stdout + r.stderr);
    return r.stdout;
  }
  const alive = async (port) => { try { return (await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } };
  try {
    const a = project(), b = project();
    const first = await up(a), second = await up(a), preview = await up(a, true);
    const otherProject = await up(b), foreign = await up(b, false, true);
    assert.match(stop(a, first.port), /Stopped verified dev/);
    assert.equal(await alive(first.port), false);
    assert.equal(await alive(second.port), true);
    assert.equal(await alive(preview.port), true);
    assert.match(stop(a, first.port), /Nothing to stop/);
    assert.match(stop(a, otherProject.port, 1), /REFUSED/);
    assert.match(stop(a, foreign.port, 1), /REFUSED/);
    const path = join(a, ".vite/dev-services", `${second.child.pid}.json`), original = readFileSync(path, "utf8");
    unlinkSync(path);
    assert.match(stop(a, second.port, 1), /No ownership record/);
    assert.equal(await alive(second.port), true);
    writeFileSync(path, JSON.stringify({ ...JSON.parse(original), ticks: "0" }));
    assert.match(stop(a, second.port, 1), /start time changed/);
    assert.equal(await alive(second.port), true);
    writeFileSync(path, original);
    const result = stop(a);
    assert.match(result, /Stopped verified preview/);
    assert.equal(await alive(second.port), false);
    assert.equal(await alive(preview.port), false);
    assert.equal(await alive(otherProject.port), true);
    assert.equal(await alive(foreign.port), true);
    assert.match(stop(a), /Nothing to stop/);
  } finally {
    // Only child handles created by this test, never global PID/name searches.
    for (const child of children) if (child.exitCode === null) child.kill();
  }
});
