import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import type { Scene } from "../../src/scene.ts";

const output = "test-results/baseline";
async function fixture(page: Page, engine: string) {
  await page.goto(`/frame.html?engine=${engine}`);
  await page.waitForFunction(() => window.__ready && window.__configure);
  expect(await page.evaluate(() => window.__engine.supported())).toBe(true);
}
async function configure(page: Page, patch: Partial<Scene>) {
  await page.evaluate((p) => window.__configure(p), patch);
  await page.waitForTimeout(180);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function state(page: Page) {
  return page.evaluate(() => {
    const card = document.getElementById("card")!;
    const ref = (card as HTMLElement).style.getPropertyValue("--hyalite");
    const f = ref.startsWith("url")
      ? document.querySelector(ref.slice(4, -1))
      : null;
    return {
      info: window.__engine.info(),
      graph: f?.outerHTML.replace(
        /(?:liquid-glass|hyalite)-\d+(?:-m\d+)?/g,
        "FILTER",
      ),
      edge: (card as HTMLElement).style.getPropertyValue("--hyalite-edge"),
    };
  });
}

for (const [engine, url] of [
  ["original", "/reference/hyalite-v0.5.0/demo/cases.html"],
  ["port", "/tests/port-cases.html"],
])
  test(`upstream Chromium cases / ${engine}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForFunction(() => (window as any).__hyaliteCases, {
      timeout: 90_000,
    });
    const result = await page.evaluate(() => (window as any).__hyaliteCases);
    console.log(`${engine}: ${result.results.length} upstream checks`);
    expect(
      result.results.filter((line: string) => line.startsWith("✗")),
    ).toEqual([]);
    expect(result.ok).toBe(true);
  });

test("same Chromium: exact maps, filter graphs and rendered pixels", async ({
  browser,
}, testInfo) => {
  mkdirSync(output, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 500, height: 516 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const a = await context.newPage(),
    b = await context.newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  await fixture(a, "original");
  await fixture(b, "port");
  const image =
    "data:image/svg+xml;base64," +
    readFileSync("tests/fixtures/background.svg").toString("base64");
  const cases: [string, Partial<Scene>][] = [
    ["defaults", {}],
    ["asymmetric", { radius: "48px 12px 64px 4px" }],
    ["circle", { width: 220, height: 220, radius: "50%" }],
    ["capsule", { width: 360, height: 100, radius: "50%" }],
    ["overlap", { width: 320, height: 40, radius: "24px 24px 0 0" }],
    ["ellipse", { width: 300, height: 220, radius: "30px / 50px" }],
    [
      "nonfolding",
      { background: "grid", opts: { slope: 0.85, smooth: 1, dispersion: 0.5 } },
    ],
    ["no-smooth", { opts: { slope: 0.85, smooth: 0, dispersion: 0 } }],
    ["lip", { opts: { shape: "lip", slope: 0.9, shade: 0.7, rim: 1.2 } }],
    [
      "thick-dispersion",
      {
        background: "stripes",
        opts: { thickness: 300, bevel: 60, dispersion: 2, sat: 1 },
      },
    ],
    ["local-image", { background: "image", image, opts: {} }],
    ["controls", { background: "stripes", sample: "controls", opts: {} }],
    ["self", { sample: "card", opts: { self: true } }],
    ["fallback", { fallback: true, opts: {} }],
  ];
  const comparisons: object[] = [];
  for (const [name, patch] of cases) {
    await configure(a, patch);
    await configure(b, patch);
    expect(await state(b), `${name}: map / SVG structure`).toEqual(
      await state(a),
    );
    const original = await a
      .locator("#scene")
      .screenshot({ path: `${output}/${name}-original.png` });
    const port = await b
      .locator("#scene")
      .screenshot({ path: `${output}/${name}-port.png` });
    const p = PNG.sync.read(original),
      q = PNG.sync.read(port),
      diff = new PNG({ width: p.width, height: p.height });
    const pixels = pixelmatch(p.data, q.data, diff.data, p.width, p.height, {
      threshold: 0,
      includeAA: true,
    });
    if (pixels)
      writeFileSync(`${output}/${name}-diff.png`, PNG.sync.write(diff));
    comparisons.push({ name, pixels, total: p.width * p.height });
    expect(pixels, `${name}: exact pixel difference`).toBe(0);
  }
  const report = {
    browser: browser.version(),
    viewport: "500x516 (scene 500x480)",
    dpr: 1,
    comparisons,
    errors,
  };
  writeFileSync(`${output}/visual.json`, JSON.stringify(report, null, 2));
  await testInfo.attach("visual baseline", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  await context.close();
});

test("materialize at identical animation timestamps renders identically", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 500, height: 516 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  await context.addInitScript(() => {
    const native = window.requestAnimationFrame.bind(window);
    let id = 100_000;
    const queue = new Map<number, FrameRequestCallback>();
    (window as any).__freeze = false;
    window.requestAnimationFrame = (fn) =>
      (window as any).__freeze ? (queue.set(++id, fn), id) : native(fn);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.cancelAnimationFrame = (n) => {
      queue.delete(n);
      cancel(n);
    };
    (window as any).__tick = (t: number) => {
      const list = [...queue.values()];
      queue.clear();
      list.forEach((fn) => fn(t));
    };
  });
  const a = await context.newPage(),
    b = await context.newPage();
  for (const [page, engine] of [
    [a, "original"],
    [b, "port"],
  ] as const) {
    await fixture(page, engine);
    await page.evaluate(() => {
      (window as any).__freeze = true;
      window.__configure({ opts: { materialize: 400 }, revision: 1 });
    });
    await page.waitForFunction(() =>
      /-m\d+/.test(
        document.getElementById("card")!.style.getPropertyValue("--hyalite"),
      ),
    );
  }
  for (const timestamp of [1000, 1100, 1200, 1400]) {
    for (const p of [a, b]) {
      await p.evaluate((t) => (window as any).__tick(t), timestamp);
      await p.waitForTimeout(50);
    }
    expect((await state(b)).graph).toEqual((await state(a)).graph);
    // Raw CDP capture does not wait for rAF, which is deliberately under test control here.
    const shot = async (p: Page) => {
      const cdp = await context.newCDPSession(p);
      const { data } = await cdp.send("Page.captureScreenshot", {
        clip: { x: 0, y: 0, width: 500, height: 480, scale: 1 },
      });
      await cdp.detach();
      return PNG.sync.read(Buffer.from(data, "base64"));
    };
    const p = await shot(a),
      q = await shot(b);
    expect(
      pixelmatch(p.data, q.data, undefined, 500, 480, {
        threshold: 0,
        includeAA: true,
      }),
      `materialize ${timestamp}`,
    ).toBe(0);
  }
  await context.close();
});

test("TS lifecycle: StrictMode replay, immediate ramp cleanup, watcher ownership and cancellation", async ({
  page,
}) => {
  await fixture(page, "port");
  const result = await page.evaluate(async () => {
    const api = window.__engine;
    document.querySelectorAll(".glass").forEach((el) => api.detach(el));
    const a = document.createElement("div"),
      b = document.createElement("div");
    document.body.append(a, b);
    const el = document.createElement("div");
    el.className = "watched";
    el.style.cssText = "width:144px;height:90px;border-radius:16px";
    a.append(el);
    const wa = api.watch(a, ".watched", { materialize: 1000 });
    const wb = api.watch(b, ".watched", { materialize: 1000 });
    const flush = () => new Promise((r) => setTimeout(r, 30));
    const before = el.style.getPropertyValue("--hyalite");
    b.append(el);
    await flush();
    wa.stop();
    const handover = el.style.getPropertyValue("--hyalite");
    api.unwatch();
    const afterUnwatch = el.style.getPropertyValue("--hyalite");
    const leftAfterUnwatch = document.querySelectorAll("filter").length;
    for (let i = 0; i < 5; i++) {
      api.attach(el, { materialize: 1000 });
      api.refresh(el);
      api.detach(el);
    }
    const immediateFilters = document.querySelectorAll("filter").length;
    api.attach(el);
    const first = api.setOpts({ blur: 3 }),
      second = api.setOpts({ blur: 2 });
    await Promise.all([first, second]);
    const ref = el.style.getPropertyValue("--hyalite");
    const blur = document
      .querySelector(ref.slice(4, -1))
      ?.querySelector("feGaussianBlur")
      ?.getAttribute("stdDeviation");
    api.detach(el);
    wb.stop();
    a.remove();
    b.remove();
    return {
      before: before.startsWith("url"),
      handover: handover.startsWith("url"),
      afterUnwatch,
      leftAfterUnwatch,
      immediateFilters,
      blur,
      finalFilters: document.querySelectorAll("filter").length,
    };
  });
  expect(result).toEqual({
    before: true,
    handover: true,
    afterUnwatch: "",
    leftAfterUnwatch: 0,
    immediateFilters: 0,
    blur: "2",
    finalFilters: 0,
  });
  await configure(page, { opts: { materialize: 600 }, revision: 2 });
  await configure(page, { revision: 3 });
  await page.waitForTimeout(700);
  expect(await page.locator('filter[id*="-m"]').count()).toBe(0);
  expect(await page.locator("filter").count()).toBe(1);
});

test("playground: synchronized drag, native controls, local upload, switching and fallback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const a = page.frameLocator('iframe[title="Original 0.5.0"]'),
    b = page.frameLocator('iframe[title="TypeScript Port"]');
  await expect(a.locator("#card")).toBeVisible();
  await expect(b.locator("#card")).toBeVisible();
  await a.getByRole("button", { name: "移动卡片" }).press("ArrowRight");
  await expect(b.locator("#card")).toHaveCSS("left", "110px");
  await page
    .getByRole("combobox", { name: "样例", exact: true })
    .selectOption("controls");
  for (const f of [a, b]) {
    const input = f.locator("#native-input");
    await input.focus();
    await page.keyboard.type("Native text 123");
    await expect(input).toHaveValue("Native text 123");
    await page.keyboard.press("Tab");
    await expect(f.locator("#native-button")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(f.locator("#native-button")).toHaveText("点击计数 1");
  }
  await page
    .getByRole("combobox", { name: "背景", exact: true })
    .selectOption("image");
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/background.svg");
  await expect(a.locator("#scene")).toHaveCSS("background-image", /blob:/);
  await expect(b.locator("#scene")).toHaveCSS("background-image", /blob:/);
  await page.getByRole("checkbox", { name: "模拟不支持 SVG 折射" }).check();
  for (const f of [a, b]) {
    await expect(f.locator(".frame-status")).toContainText("CSS fallback");
    await expect(f.locator("#card")).toHaveCSS("backdrop-filter", "blur(1px)");
  }
  await page.getByRole("button", { name: "TypeScript", exact: true }).click();
  await expect(page.locator(".pane.original")).toBeHidden();
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("300");
  await page.screenshot({ path: `${output}/playground.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(errors).toEqual([]);
});

test("initial cache and resize measurements (measurement only)", async ({
  browser,
}, testInfo) => {
  mkdirSync(output, { recursive: true });
  const results: object[] = [];
  for (const engine of ["original", "port"]) {
    const page = await browser.newPage({
      viewport: { width: 500, height: 516 },
      deviceScaleFactor: 1,
    });
    await fixture(page, engine);
    const metrics = await page.evaluate(async () => {
      const api = window.__engine;
      document.querySelectorAll(".glass").forEach((el) => api.detach(el));
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;left:20px;top:20px;width:314px;height:218px;border-radius:17px;backdrop-filter:var(--hyalite,blur(1px))";
      document.getElementById("scene")!.append(el);
      let builds = 0,
        start = 0;
      const toOnBuildMs: number[] = [];
      const onBuild = () => {
        builds++;
        toOnBuildMs.push(performance.now() - start);
      };
      start = performance.now();
      api.attach(el, { onBuild });
      const cold = {
        builds,
        attachMs: performance.now() - start,
        toOnBuildMs: [...toOnBuildMs],
      };
      const beforeWarm = builds;
      api.detach(el);
      start = performance.now();
      api.attach(el, { onBuild });
      const warm = {
        builds: builds - beforeWarm,
        attachMs: performance.now() - start,
      };
      const beforeBlur = builds;
      start = performance.now();
      await api.setOpts({ blur: 3 });
      const blur = {
        builds: builds - beforeBlur,
        ms: performance.now() - start,
      };
      const measure = async (settle: number) => {
        await api.setOpts({ settle });
        let fallbackFrames = 0,
          missingFilters = 0;
        const intervals: number[] = [];
        let last = performance.now();
        const before = builds;
        for (let i = 0; i < 30; i++) {
          el.style.width = `${(settle ? 214 : 314) + i * 3}px`;
          start = performance.now();
          await new Promise((r) => requestAnimationFrame(r));
          const now = performance.now();
          intervals.push(now - last);
          last = now;
          const ref = el.style.getPropertyValue("--hyalite");
          if (!ref.startsWith("url")) fallbackFrames++;
          else if (!document.querySelector(ref.slice(4, -1))) missingFilters++;
        }
        await new Promise((r) => setTimeout(r, settle + 250));
        return {
          mapBuilds: builds - before,
          frames: intervals.length,
          framesOver50ms: intervals.filter((n) => n > 50).length,
          maxFrameMs: Math.max(...intervals),
          fallbackFrames,
          missingFilters,
        };
      };
      const live = await measure(0),
        settle = await measure(120);
      api.detach(el);
      el.remove();
      return { cold, warm, blur, live, settle };
    });
    expect(metrics.cold.builds).toBe(1);
    expect(metrics.warm.builds).toBe(0);
    expect(metrics.blur.builds).toBe(0);
    expect(
      metrics.live.fallbackFrames +
        metrics.settle.fallbackFrames +
        metrics.live.missingFilters +
        metrics.settle.missingFilters,
    ).toBe(0);
    results.push({ engine, ...metrics });
    await page.close();
  }
  const report = {
    browser: browser.version(),
    dpr: 1,
    viewport: "500x516",
    results,
  };
  writeFileSync(`${output}/performance.json`, JSON.stringify(report, null, 2));
  await testInfo.attach("initial performance", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
});

test("idle cache eviction and manual/watch ownership match upstream", async ({
  browser,
}) => {
  const results = [];
  for (const engine of ["original", "port"]) {
    const page = await browser.newPage();
    await fixture(page, engine);
    results.push(
      await page.evaluate(async () => {
        const api = window.__engine;
        document.querySelectorAll(".glass").forEach((el) => api.detach(el));
        const container = document.createElement("div"),
          el = document.createElement("div");
        el.style.cssText = "width:172px;height:92px;border-radius:9px";
        container.append(el);
        document.body.append(container);
        let builds = 0;
        const onBuild = () => builds++;
        api.attach(el, { thickness: 100, onBuild });
        api.detach(el);
        const afterCold = builds;
        api.attach(el, { thickness: 100, onBuild });
        api.detach(el);
        const afterWarm = builds;
        for (let i = 0; i < 25; i++) {
          api.attach(el, { thickness: 110 + i, onBuild });
          api.detach(el);
        }
        const beforeEvictionProbe = builds;
        api.attach(el, { thickness: 100, onBuild });
        const evictionBuilds = builds - beforeEvictionProbe;
        api.watch(container, ".watched");
        el.className = "watched";
        await new Promise((r) => setTimeout(r, 20));
        api.unwatch();
        const manualSurvives = el.style
          .getPropertyValue("--hyalite")
          .startsWith("url");
        api.detach(el);
        const watcher = api.watch(container, ".watched");
        el.className = "";
        await new Promise((r) => setTimeout(r, 20));
        const classLossDetaches = el.style.getPropertyValue("--hyalite") === "";
        watcher.stop();
        container.remove();
        return {
          afterCold,
          afterWarm,
          evictionBuilds,
          manualSurvives,
          classLossDetaches,
        };
      }),
    );
    await page.close();
  }
  expect(results[0]).toEqual({
    afterCold: 1,
    afterWarm: 1,
    evictionBuilds: 1,
    manualSurvives: true,
    classLossDetaches: true,
  });
  expect(results[1]).toEqual(results[0]);
});

test("reduced motion disables ramps and an unsupported browser safely uses CSS", async ({
  browser,
}) => {
  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const page = await reduced.newPage();
  await fixture(page, "port");
  await configure(page, { opts: { materialize: 1000 }, revision: 1 });
  expect(await page.locator('filter[id*="-m"]').count()).toBe(0);
  await reduced.close();
  const unsupported = await browser.newContext();
  await unsupported.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", {
      value: { brands: [{ brand: "Unsupported", version: "1" }] },
    });
    Object.defineProperty(navigator, "userAgent", { value: "Unsupported/1" });
  });
  for (const engine of ["original", "port"]) {
    const p = await unsupported.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`/frame.html?engine=${engine}`);
    await p.waitForFunction(() => window.__ready);
    await expect(p.locator(".frame-status")).toContainText("CSS fallback");
    await expect(p.locator("#card")).toHaveCSS("backdrop-filter", "blur(1px)");
    expect(errors).toEqual([]);
  }
  await unsupported.close();
});
