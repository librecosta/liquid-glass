// M2 production Playground measurements. Not a painted-FPS benchmark.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, totalmem, platform, release } from "node:os";
import assert from "node:assert/strict";
import { instrument } from "./perf-instrument.mjs";

const url = process.env.LG_BASE_URL ?? "http://127.0.0.1:4176";
const directory = "performance-results/m2";
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", args: ["--disable-background-networking"] });
const system = await browser.newBrowserCDPSession();
const gpu = await system.send("SystemInfo.getInfo");
const report = {
  date: new Date().toISOString(), browser: browser.version(), renderer: gpu.gpu.auxAttributes.glRenderer,
  gpuDevices: gpu.gpu.devices, os: `${platform()} ${release()}`, cpu: cpus()[0].model, logicalCpus: cpus().length,
  memoryGiB: totalmem() / 2 ** 30, mode: "production, headless installed Chrome; no CPU/network throttling",
  viewport: [1440, 1000], scene: [1010, 618], dpr: 1, glass: [400, 280], radius: "42px",
  position: [305, 169], background: "CSS precision grid", sample: "English card", repeats: 3, moves: 60,
  method: "Fresh browser context per condition, cache cold per JS module. Three trials, rotated material and quality order. Initial assembly includes navigation + fonts + 250ms settling. Two material switches (alternate/back) before real pointer-capture dragging. 8ms requested host pause between moves. CDP TaskDuration is main-thread time. rAF and DOM-update intervals are callback/style timing, NOT painted/presented FPS. Separate trace runs excluded from timing summaries.",
  rows: [], traces: [],
};
const percentile = (values, p) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null;
};
async function metrics(cdp) {
  return Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
}
function delta(before, after) {
  return Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].map((key) => [key + "Ms", (after[key] - before[key]) * 1000]));
}
async function snapshot(page) {
  return page.evaluate(() => {
    window.__m2Snapshot = { card: document.getElementById("card"), opts: window.__scene.opts,
      filters: [...document.querySelectorAll("filter")], svg: [...document.querySelectorAll("filter")].map((f) => f.outerHTML) };
  });
}
async function retained(page) {
  return page.evaluate(() => {
    const old = window.__m2Snapshot;
    return old.card === document.getElementById("card") && old.opts === window.__scene.opts &&
      old.filters.every((f, i) => f === document.querySelectorAll("filter")[i]) &&
      JSON.stringify(old.svg) === JSON.stringify([...document.querySelectorAll("filter")].map((f) => f.outerHTML));
  });
}
async function drag(page) {
  const handle = page.getByRole("button", { name: "Move glass", exact: true });
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.evaluate(() => {
    window.__startPerf();
    window.__m2Dom = [];
    window.__m2Observer = new MutationObserver(() => window.__m2Dom.push(performance.now()));
    window.__m2Observer.observe(document.getElementById("position"), { attributes: true, attributeFilter: ["style"] });
  });
  await page.mouse.down();
  assert.equal(await handle.evaluate((el) => el.hasPointerCapture(1)), true);
  const dispatch = [];
  for (let i = 0; i < report.moves; i++) {
    const start = performance.now();
    await page.mouse.move(box.x + 10 + Math.round(40 * Math.sin(i / 9)), box.y + 10 + Math.round(24 * Math.sin(i / 11)));
    dispatch.push(performance.now() - start);
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  const result = await page.evaluate(() => {
    window.__m2Observer.disconnect();
    return { ...window.__stopPerf(), domTimes: window.__m2Dom };
  });
  const dom = result.domTimes.slice(1).map((time, i) => time - result.domTimes[i]);
  assert.equal(result.maps, 0); assert.equal(result.png.length, 0);
  assert.ok(result.domTimes.length > 15, "Real style updates occurred");
  return { elapsedMs: result.elapsed, raf: { n: result.frames.length, p50: percentile(result.frames, .5), p95: percentile(result.frames, .95), intervals: result.frames },
    dom: { updates: result.domTimes.length, p50: percentile(dom, .5), p95: percentile(dom, .95), intervals: dom },
    dispatchP95Ms: percentile(dispatch, .95), pointers: result.pointers, maps: result.maps, pngBuilds: result.png.length, resizeCallbacks: result.ro };
}
async function run(count, quality, material, trial, trace = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript(instrument);
  const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await cdp.send("Performance.enable");
  try {
    const start = performance.now();
    await page.goto(`${url}/?lang=en&quality=${quality}&material=${material}&background=grid&instances=${count}`);
    await page.waitForFunction((count) => window.__ready && window.__scene.instances === count, count);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".card").count(), count);
    const initial = await page.evaluate(() => ({ maps: window.__perf.maps, pngBuilds: window.__perf.png.length,
      pngMs: window.__perf.png, filters: document.querySelectorAll("filter").length, scene: [window.__scene.width, window.__scene.height, window.__scene.x, window.__scene.y],
      material: document.querySelector(".public-scene").dataset.material, quality: window.__scene.quality, opts: window.__scene.opts }));
    assert.deepEqual(initial.scene, [400, 280, 305, 169]);
    assert.equal(initial.quality, quality); assert.deepEqual(initial.opts, {});
    const assembly = { ...initial, wallMs: performance.now() - start, mainThread: await metrics(cdp) };
    await snapshot(page);
    await page.evaluate(() => window.__startPerf(false));
    const before = await metrics(cdp), switchStart = performance.now();
    const picker = page.getByRole("group", { name: "Material", exact: true });
    for (const next of [material === "clear" ? "Soft" : "Clear", material[0].toUpperCase() + material.slice(1)]) {
      await picker.getByRole("button", { name: next, exact: true }).click();
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    }
    const switchPerf = await page.evaluate(() => window.__stopPerf());
    const switching = { twoSwitchWallMs: performance.now() - switchStart, mainThread: delta(before, await metrics(cdp)), maps: switchPerf.maps, pngBuilds: switchPerf.png.length, retained: await retained(page) };
    assert.equal(switching.maps, 0); assert.equal(switching.pngBuilds, 0); assert.equal(switching.retained, true);
    if (trace) await cdp.send("Tracing.start", { categories: "devtools.timeline,cc,gpu,disabled-by-default-devtools.timeline", transferMode: "ReturnAsStream" });
    const dragBefore = await metrics(cdp);
    const interaction = await drag(page);
    interaction.mainThread = delta(dragBefore, await metrics(cdp));
    assert.equal(await retained(page), true); assert.deepEqual(errors, []);
    const row = { count, quality, material, trial, assembly, switching, interaction };
    if (trace) {
      const completed = new Promise((done) => cdp.once("Tracing.tracingComplete", done));
      await cdp.send("Tracing.end");
      const { stream } = await completed;
      let data = "";
      for (;;) { const chunk = await cdp.send("IO.read", { handle: stream }); data += chunk.data; if (chunk.eof) break; }
      await cdp.send("IO.close", { handle: stream });
      writeFileSync(`${directory}/trace-${material}.json`, data);
      const stats = {};
      for (const event of JSON.parse(data).traceEvents) if (/^(PrePaint|Paint|RasterTask|UpdateLayer|Commit|DrawFrame|SubmitCompositorFrame|CompositeLayers|EndActivateToSubmitCompositorFrame|SubmitCompositorFrameToPresentationCompositorFrame)$/.test(event.name)) {
        const entry = stats[event.name] ??= { count: 0, completeEvents: 0, asyncBegins: 0, durationMs: 0 };
        entry.count++;
        if (event.ph === "X") { entry.completeEvents++; entry.durationMs += (event.dur ?? 0) / 1000; }
        if (event.ph === "b") entry.asyncBegins++;
      }
      report.traces.push({ count, quality, material, rawFile: `${directory}/trace-${material}.json`, traceEvents: JSON.parse(data).traceEvents.length, stats, note: "Separate instrumented run. Chrome event availability varies; count includes all phases, asyncBegins counts b phases, durationMs sums only complete X events. Durations span different threads and are not painted FPS or GPU-time totals." });
    } else report.rows.push(row);
    writeFileSync(`${directory}/partial.json`, JSON.stringify(report));
    console.log(JSON.stringify({ count, quality, material, trial, trace, rafP95: interaction.raf.p95, domP95: interaction.dom.p95, switchMainMs: switching.mainThread.TaskDurationMs }));
  } finally { await context.close(); }
}
try {
  for (let trial = 1; trial <= 3; trial++)
    for (const count of [1, 5, 20])
      for (const quality of trial % 2 ? ["Balanced", "Fast"] : ["Fast", "Balanced"])
        for (const material of ["clear", "soft", "prismatic"].slice(trial - 1).concat(["clear", "soft", "prismatic"].slice(0, trial - 1)))
          await run(count, quality, material, trial);
  for (const material of ["clear", "prismatic"]) await run(20, "Balanced", material, "trace-only", true);
  writeFileSync("docs/m2-material-measurements.json", JSON.stringify(report, (_, value) => typeof value === "number" ? Math.round(value * 1e6) / 1e6 : value, 2) + "\n");
} finally { await browser.close(); }
