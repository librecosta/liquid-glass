// Historical LG-C3 production smoke sample: run against the UI at b6d8875
// (and 56fc13c for the paired baseline), not the responsive LG-D website.
// Warm quality switching, then genuine five-card drag. Keep recorded results intact.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { QUALITY_PRESETS, QUALITY_LABELS } from "../src/quality.ts";
import { instrument } from "./perf-instrument.mjs";

const base = process.env.LG_SWITCH_URL || "http://127.0.0.1:4185";
const before = process.env.LG_SWITCH_BEFORE_URL;
const targets = before ? [
  {label: "before-56fc13c", url: before, legacy: true},
  {label: "after-C3", url: base, legacy: false},
] : [{label: "after-C3", url: base, legacy: false}];
const browser = await chromium.launch({
  ...(process.env.LG_CHROME ? {executablePath: process.env.LG_CHROME} : {channel: "chrome"}),
  args: ["--disable-background-networking"],
});
const session = await browser.newBrowserCDPSession();
const {gpu} = await session.send("SystemInfo.getInfo");
await session.detach();
const percentile = (values, p) => {
  const a = values.slice().sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] ?? null;
};
const rows = [];
try {
  for (const dpr of [1, 2]) for (const quality of ["Balanced", "Fast"]) for (let trial = 1; trial <= 3; trial++) for (const target of trial % 2 ? targets : [...targets].reverse()) {
    const context = await browser.newContext({viewport: {width: 1480, height: 960}, deviceScaleFactor: dpr});
    await context.addInitScript(instrument);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${target.url}/?quality=${quality}`);
    await page.waitForFunction(() => window.__ready && window.__engine);
    await page.evaluate(() => window.__configure({instances: 5}));
    await page.waitForTimeout(180);
    await page.evaluate(() => window.__sampleCard = document.getElementById("card"));
    for (const q of ["Reference", "Fast", "Balanced", quality])
      await page.getByRole("button", {name: target.legacy ? q === "Reference" ? q : `${q}（实验）` : QUALITY_LABELS[q], exact: true}).click();
    await page.waitForTimeout(180);
    const graph = await page.evaluate(() => ({
      sameNode: document.getElementById("card") === window.__sampleCard,
      primitives: document.querySelector("filter").children.length,
      displacements: document.querySelector("filter").querySelectorAll("feDisplacementMap").length,
      edge: getComputedStyle(document.getElementById("card")).boxShadow,
      ramps: document.querySelectorAll('filter[id*="-m"]').length,
    }));
    await page.evaluate(() => {
      window.__startPerf();
      window.__domTimes = [];
      window.__domObserver = new MutationObserver(() => window.__domTimes.push(performance.now()));
      window.__domObserver.observe(document.getElementById("position"), {attributes: true, attributeFilter: ["style"]});
    });
    const box = await page.getByRole("button", {name: "移动卡片"}).boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    if (!await page.locator(".drag-handle").evaluate(el => el.hasPointerCapture(1))) throw Error("Not dragging");
    const dispatch = [];
    for (let i = 0; i < 45; i++) {
      const start = performance.now();
      await page.mouse.move(box.x + 10 + Math.round(65 * Math.sin(i / 13)), box.y + 10 + Math.round(30 * Math.sin(i / 19)));
      dispatch.push(performance.now() - start);
      await page.waitForTimeout(8);
    }
    await page.mouse.up();
    const m = await page.evaluate(() => {
      window.__domObserver.disconnect();
      return {...window.__stopPerf(), domTimes: window.__domTimes};
    });
    if (errors.length || !graph.sameNode || (!target.legacy && graph.edge !== "none") || graph.ramps || m.maps || m.png.length || m.ro || m.commits !== 1 || !m.commitHook || m.pointers < 46 || m.domTimes.length < 30)
      throw Error(JSON.stringify({errors, graph, m}));
    const domIntervals = m.domTimes.slice(1).map((t, i) => t - m.domTimes[i]);
    const row = {
      label: target.label, quality,
      opts: target.legacy ? {dispersion: quality === "Fast" ? 0 : 0.8, sat: 1, edge: 0.32, rim: 1.76} : QUALITY_PRESETS[quality],
      dpr, trial, count: 5, graph,
      elapsed: m.elapsed,
      raf: {n: m.frames.length, p50: percentile(m.frames, .5), p95: percentile(m.frames, .95), over33: m.frames.filter(v => v > 33).length, over50: m.frames.filter(v => v > 50).length},
      dom: {updates: m.domTimes.length, p50: percentile(domIntervals, .5), p95: percentile(domIntervals, .95)},
      dispatchP95: percentile(dispatch, .95), maps: m.maps, pngBuilds: m.png.length, ro: m.ro, commits: m.commits,
    };
    rows.push(row);
    console.log(JSON.stringify({label: target.label, quality, dpr, trial, rafP95: row.raf.p95, domP95: row.dom.p95}));
    await context.close();
  }
  writeFileSync(before ? "docs/lg-c3-paired-measurements.json" : "docs/lg-c3-measurements.json", JSON.stringify({
    browser: browser.version(), renderer: gpu.auxAttributes.glRenderer,
    mode: "production", viewport: [1480, 960], scene: [500, 480], moves: 45, repeats: 3,
    method: `${before ? "24 paired five-card runs, alternating before/after order each trial" : "12 five-card runs"} after Reference/Fast/Balanced switching; real pointer capture. rAF includes idle callbacks, not painted FPS; DOM style-update intervals and input dispatch measured separately. Times in ms. No trace overhead in this smoke sample.`,
    rows,
  }, (_, v) => typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v, 2) + "\n");
} finally {
  await browser.close();
}
