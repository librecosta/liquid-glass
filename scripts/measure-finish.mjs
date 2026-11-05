import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { FINISH_EXPERIMENTS } from "../src/finish-experiments.ts";
import {QUALITY_PRESETS} from '../src/quality.ts';
import { instrument } from "./perf-instrument.mjs";
import { DEFAULTS } from "../src/core/index.ts";
if (DEFAULTS.dispersion !== 1.6 || DEFAULTS.edge !== 0.32 || DEFAULTS.rim !== 1.76)
  throw Error("Historical LG-C2 measurements require the 56fc13c checkout. Use measure-switching.mjs for current defaults.");
const base = process.env.LG_FINISH_URL || "http://127.0.0.1:4183";
const launch = () =>
  chromium.launch({
    ...(process.env.LG_CHROME
      ? { executablePath: process.env.LG_CHROME }
      : { channel: "chrome" }),
    args: ["--disable-background-networking"],
  });
const names = ["reference", "edge-0", "sat-1", "optical", "balanced", "fast"];
const percentile = (a, p) => {
  a = [...a].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] ?? null;
};
mkdirSync("performance-results/c2", { recursive: true });
mkdirSync("docs/c2", { recursive: true });
const browser = await launch(),
  version = browser.version(),
  session = await browser.newBrowserCDPSession();
const { gpu } = await session.send("SystemInfo.getInfo");
await session.detach();
const rows = [];
for (const dpr of [1, 2])
  for (const id of names)
    for (let trial = 1; trial <= 3; trial++) {
      const context = await browser.newContext({
        viewport: { width: 1480, height: 960 },
        deviceScaleFactor: dpr,
      });
      await context.addInitScript(instrument);
      const page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/?experiment=${id}`);
      await page.waitForFunction(() => window.__ready && window.__engine);
      await page.reload();
      await page.waitForFunction(() => window.__ready && window.__engine);
      for (const count of [1, 5]) {
        await page.evaluate(
          (count) => window.__configure({ instances: count, x: 100, y: 142 }),
          count,
        );
        await page.waitForTimeout(180);
        const graph = await page.evaluate(preset => ({
          primitives: document.querySelector("filter").children.length,
          displacements: document
            .querySelector("filter")
            .querySelectorAll("feDisplacementMap").length,
          mapSize: window.__engine.info().mapSize,
          edge: getComputedStyle(document.getElementById("card")).boxShadow,
          opts: { ...window.__engine.DEFAULTS,...preset, ...window.__scene.opts },
        }),QUALITY_PRESETS[FINISH_EXPERIMENTS.find(v=>v.id===id).quality]);
        await page.evaluate(() => {
          window.__startPerf();
          const times = [];
          window.__domTimes = times;
          window.__domObserver = new MutationObserver(() =>
            times.push(performance.now()),
          );
          window.__domObserver.observe(document.getElementById("position"), {
            attributes: true,
            attributeFilter: ["style"],
          });
        });
        const begin = await cdp.send("Performance.getMetrics");
        let trace = [];
        const listener = (e) => trace.push(...e.value);
        if (trial === 1) {
          cdp.on("Tracing.dataCollected", listener);
          await cdp.send("Tracing.start", {
            categories:
              "devtools.timeline,cc,blink,disabled-by-default-devtools.timeline",
            transferMode: "ReportEvents",
          });
        }
        const box = await page
          .getByRole("button", { name: "移动卡片" })
          .boundingBox();
        await page.mouse.move(box.x + 10, box.y + 10);
        await page.mouse.down();
        await page.evaluate(() => {
          if (!document.querySelector(".drag-handle").hasPointerCapture(1))
            throw Error("Not dragging");
        });
        const dispatch = [];
        for (let i = 0; i < 45; i++) {
          const t = performance.now();
          await page.mouse.move(
            box.x + 10 + Math.round(65 * Math.sin(i / 13)),
            box.y + 10 + Math.round(30 * Math.sin(i / 19)),
          );
          dispatch.push(performance.now() - t);
          await page.waitForTimeout(8);
        }
        await page.mouse.up();
        const m = await page.evaluate(() => {
            window.__domObserver.disconnect();
            return { ...window.__stopPerf(), domTimes: window.__domTimes };
          }),
          end = await cdp.send("Performance.getMetrics");
        let traceStats;
        if (trial === 1) {
          const done = new Promise((r) =>
            cdp.once("Tracing.tracingComplete", r),
          );
          await cdp.send("Tracing.end");
          await done;
          cdp.off("Tracing.dataCollected", listener);
          traceStats = {};
          for (const e of trace)
            if (
              e.ph === "X" &&
              [
                "Paint",
                "RasterTask",
                "PaintArtifactCompositor::Update",
              ].includes(e.name)
            ) {
              const v = (traceStats[e.name] ??= { count: 0, ms: 0 });
              v.count++;
              v.ms += (e.dur || 0) / 1000;
            }
          writeFileSync(
            `performance-results/c2/${id}-dpr${dpr}-n${count}.json`,
            JSON.stringify({ traceEvents: trace }),
          );
        }
        const delta = (k) =>
          1000 *
          (end.metrics.find((x) => x.name === k).value -
            begin.metrics.find((x) => x.name === k).value);
        if (
          errors.length ||
          m.maps ||
          m.png.length ||
          !m.commitHook ||
          m.commits !== 1 ||
          m.pointers < 46 ||
          m.domTimes.length < 30
        )
          throw Error(JSON.stringify({ errors, m }));
        const domIntervals = m.domTimes
          .slice(1)
          .map((t, i) => t - m.domTimes[i]);
        rows.push({
          id,
          dpr,
          count,
          trial,
          graph,
          elapsed: m.elapsed,
          raf: {
            n: m.frames.length,
            p50: percentile(m.frames, 0.5),
            p95: percentile(m.frames, 0.95),
            p99: percentile(m.frames, 0.99),
            over33: m.frames.filter((v) => v > 33).length,
            over50: m.frames.filter((v) => v > 50).length,
          },
          dom: {
            updates: m.domTimes.length,
            p50: percentile(domIntervals, 0.5),
            p95: percentile(domIntervals, 0.95),
          },
          dispatch: {
            p50: percentile(dispatch, 0.5),
            p95: percentile(dispatch, 0.95),
          },
          maps: m.maps,
          ro: m.ro,
          commits: m.commits,
          scriptMs: delta("ScriptDuration"),
          taskMs: delta("TaskDuration"),
          trace: traceStats,
        });
      }
      writeFileSync(
        "performance-results/c2/runs.json",
        JSON.stringify(rows, null, 2),
      );
      console.log(
        JSON.stringify({
          id,
          dpr,
          trial,
          p95: rows.slice(-2).map((r) => r.raf.p95),
        }),
      );
      await context.close();
    }
await browser.close();
const captures = [];
for (const variant of FINISH_EXPERIMENTS) {
  const b = await launch(),
    page = await b.newPage({
      viewport: { width: 500, height: 516 },
      deviceScaleFactor: 1,
    });
  await page.goto(`${base}/?fixture=1&experiment=${variant.id}`);
  await page.waitForFunction(() => window.__ready && window.__engine);
  await page.waitForTimeout(180);
  for (const background of ["forest", "grid"]) {
    if (background === "grid") {
      await page.evaluate(() => window.__configure({ background: "grid" }));
      await page.waitForTimeout(150);
    }
    const path = `docs/c2/${variant.id}-${background}.png`;
    const png = PNG.sync.read(
      await page.locator("#scene").screenshot({ path }),
    );
    const ref = PNG.sync.read(
      readFileSync(`tests/golden/reference/${background}.png`),
    );
    let bgDiff = 0;
    for (let y = 0; y < 480; y++)
      for (let x = 0; x < 500; x++) {
        if (x >= 96 && x < 404 && y >= 138 && y < 366) continue;
        const i = (y * 500 + x) * 4;
        if ([0, 1, 2].some((c) => png.data[i + c] !== ref.data[i + c]))
          bgDiff++;
      }
    const pixels = pixelmatch(ref.data, png.data, null, 500, 480, {
      threshold: 0,
      includeAA: true,
    });
    if (bgDiff || (variant.id === "reference" && pixels))
      throw Error("Capture background or Reference mismatch");
    captures.push({
      id: variant.id,
      background,
      path,
      pixels,
      backgroundPixels: bgDiff,
    });
  }
  await b.close();
}
const payload = {
  browser: version,
  renderer: gpu.auxAttributes.glRenderer,
  mode: "production",
  viewport: [1480, 960],
  scene: [500, 480],
  moves: 45,
  repeats: 3,
  method:
    "One active variant, real pointer capture, sequential contexts; rAF includes idle callbacks, not painted FPS; DOM update intervals and input dispatch latency are separate observations. First trial traced. Times in ms.",
  variants: FINISH_EXPERIMENTS,
  rows,
  captures,
};
writeFileSync(
  "docs/lg-c2-measurements.json",
  JSON.stringify(
    payload,
    (_, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v),
    2,
  ) + "\n",
);
console.log("Saved 72 drag runs and 16 captures");
