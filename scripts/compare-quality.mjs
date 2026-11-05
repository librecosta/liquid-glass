import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { instrument } from "./perf-instrument.mjs";
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--disable-background-networking"],
});
const variants = [
  ["Reference", {}],
  ["dispersion-only", { dispersion: 0.8 }],
  ["sat-only", { sat: 1 }],
  ["Balanced", { dispersion: 0.8, sat: 1 }],
  ["Fast", { dispersion: 0, sat: 1 }],
];
const pct = (a, p) => {
  a = a.slice().sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] ?? null;
};
const rows = [];
mkdirSync("docs/quality", { recursive: true });
mkdirSync("performance-results", { recursive: true });
for (const dpr of [1, 2])
  for (const [name, opts] of variants)
    for (let trial = 1; trial <= 3; trial++) {
      const context = await browser.newContext({
        viewport: { width: 1480, height: 960 },
        deviceScaleFactor: dpr,
      });
      await context.addInitScript(instrument);
      const page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      // Warm the page before timed ablation. Images are captured separately below.
      await page.goto("http://127.0.0.1:4173/");
      await page.waitForFunction(() => window.__ready && window.__engine);
      await page.reload();
      await page.waitForFunction(() => window.__ready && window.__engine);
      await page.evaluate((opts) => window.__configure({ opts }), opts);
      await page.waitForTimeout(150);
      const graph = await page.evaluate(() => {
        const filter = document.querySelector("filter");
        return {
          primitives: filter.children.length,
          displacements: filter.querySelectorAll("feDisplacementMap").length,
          transfers: filter.querySelectorAll("feComponentTransfer").length,
          mapSize: window.__engine.info().mapSize,
        };
      });
      await page.evaluate(() => window.__startPerf());
      const start = await cdp.send("Performance.getMetrics");
      const box = await page
        .getByRole("button", { name: "移动卡片" })
        .boundingBox();
      await page.mouse.move(box.x + 10, box.y + 10);
      await page.mouse.down();
      for (let i = 0; i < 45; i++) {
        await page.mouse.move(
          box.x + 10 + Math.round(65 * Math.sin(i / 13)),
          box.y + 10 + Math.round(30 * Math.sin(i / 19)),
        );
        await page.waitForTimeout(8);
      }
      await page.mouse.up();
      const m = await page.evaluate(() => window.__stopPerf()),
        end = await cdp.send("Performance.getMetrics");
      const delta = (key) =>
        1000 *
        (end.metrics.find((x) => x.name === key).value -
          start.metrics.find((x) => x.name === key).value);
      rows.push({
        dpr,
        name,
        opts,
        trial,
        graph,
        frames: m.frames.length,
        p50: pct(m.frames, 0.5),
        p95: pct(m.frames, 0.95),
        p99: pct(m.frames, 0.99),
        over33: m.frames.filter((x) => x > 33).length,
        over50: m.frames.filter((x) => x > 50).length,
        maps: m.maps,
        commits: m.commitHook ? m.commits : null,
        elapsed: m.elapsed,
        scriptMs: delta("ScriptDuration"),
        taskMs: delta("TaskDuration"),
      });
      await context.close();
    }
const browserVersion = browser.version();
await browser.close();
// Each screenshot preset starts with a fresh Chrome process and initial query
// options, matching the frozen Reference's first JPEG decode/resampling path.
for (const name of ["Reference", "Balanced", "Fast"]) {
  const capture = await chromium.launch({
    channel: "chrome",
    args: ["--disable-background-networking"],
  });
  const page = await capture.newPage({
    viewport: { width: 500, height: 516 },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://127.0.0.1:4173/?fixture=1&quality=${name}`);
  await page.waitForFunction(() => window.__ready && window.__engine);
  await page.waitForTimeout(180);
  for (const background of ["forest", "grid"]) {
    if (background === "grid") {
      await page.evaluate(() => window.__configure({ background: "grid" }));
      await page.waitForTimeout(120);
    }
    await page.locator("#scene").screenshot({
      path: `docs/quality/${name.toLowerCase()}-${background}.png`,
    });
  }
  if (name === "Reference") {
    await page.setViewportSize({ width: 1480, height: 960 });
    await page.goto("http://127.0.0.1:4173/");
    await page.waitForFunction(() => window.__ready);
    await page.screenshot({ path: "docs/lg-c-playground.png", fullPage: true });
  }
  await capture.close();
}
const differences = [];
const referenceGold = {};
for (const background of ["forest", "grid"]) {
  const ref = PNG.sync.read(
    readFileSync(`docs/quality/reference-${background}.png`),
  );
  const baseline = PNG.sync.read(
    readFileSync(`tests/golden/reference/${background}.png`),
  );
  referenceGold[background] = pixelmatch(
    ref.data,
    baseline.data,
    null,
    500,
    480,
    { threshold: 0, includeAA: true },
  );
  if (referenceGold[background])
    throw Error("Production Reference no longer matches frozen " + background);
  for (const name of ["Balanced", "Fast"]) {
    const other = PNG.sync.read(
      readFileSync(`docs/quality/${name.toLowerCase()}-${background}.png`),
    );
    let backgroundPixels = 0;
    for (let y = 0; y < 480; y++)
      for (let x = 0; x < 500; x++) {
        if (x >= 96 && x < 404 && y >= 138 && y < 366) continue;
        const i = (y * 500 + x) * 4;
        if (
          ref.data[i] !== other.data[i] ||
          ref.data[i + 1] !== other.data[i + 1] ||
          ref.data[i + 2] !== other.data[i + 2]
        )
          backgroundPixels++;
      }
    if (backgroundPixels)
      throw Error(
        `${name}/${background}: background pixels differ (${backgroundPixels})`,
      );
    differences.push({
      background,
      name,
      backgroundPixels,
      pixels: pixelmatch(ref.data, other.data, null, 500, 480, {
        threshold: 0,
        includeAA: true,
      }),
      total: 240000,
    });
  }
}
writeFileSync(
  "performance-results/quality.json",
  JSON.stringify(
    {
      browser: browserVersion,
      captures: {
        isolatedChrome: true,
        viewport: [500, 516],
        dpr: 1,
        position: [100, 142],
      },
      referenceGold,
      mode: "production",
      pointerMoves: 45,
      rows,
      differences,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    runs: rows.length,
    differences,
    graphs: rows
      .filter((x) => x.dpr === 1 && x.trial === 1)
      .map((x) => ({ name: x.name, ...x.graph })),
  }),
);
