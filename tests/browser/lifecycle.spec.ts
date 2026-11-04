import { test, expect } from "@playwright/test";

test("LibreCosta cache eviction, watcher ownership and immediate materialize cleanup", async ({
  page,
}) => {
  await page.goto("/?fixture=1");
  await page.waitForFunction(() => window.__ready && window.__engine);
  const result = await page.evaluate(async () => {
    const api = window.__engine;
    const container = document.createElement("div"),
      other = document.createElement("div"),
      el = document.createElement("div");
    el.style.cssText = "width:172px;height:92px;border-radius:9px";
    container.append(el);
    document.body.append(container, other);
    let builds = 0;
    const onBuild = () => builds++;
    api.attach(el, { thickness: 100, onBuild });
    api.detach(el);
    const cold = builds;
    api.attach(el, { thickness: 100, onBuild });
    api.detach(el);
    const warm = builds;
    for (let i = 0; i < 25; i++) {
      api.attach(el, { thickness: 110 + i, onBuild });
      api.detach(el);
    }
    const before = builds;
    api.attach(el, { thickness: 100, onBuild });
    const eviction = builds - before;
    api.watch(container, ".watched");
    el.className = "watched";
    await new Promise((r) => setTimeout(r, 30));
    api.unwatch();
    const manualSurvives = el.style
      .getPropertyValue("--hyalite")
      .startsWith("url");
    api.detach(el);
    const wa = api.watch(container, ".watched", { materialize: 1000 }),
      wb = api.watch(other, ".watched", { materialize: 1000 });
    other.append(el);
    await new Promise((r) => setTimeout(r, 30));
    wa.stop();
    const handover = el.style.getPropertyValue("--hyalite").startsWith("url");
    wb.stop();
    const stopped = el.style.getPropertyValue("--hyalite") === "";
    for (let i = 0; i < 5; i++) {
      api.attach(el, { materialize: 1000 });
      api.refresh(el);
      api.detach(el);
    }
    const ramps = document.querySelectorAll('filter[id*="-m"]').length;
    api.attach(el);
    await Promise.all([api.setOpts({ blur: 3 }), api.setOpts({ blur: 2 })]);
    const filter = document.querySelector(
      el.style.getPropertyValue("--hyalite").slice(4, -1),
    )!;
    const blur = filter
      .querySelector("feGaussianBlur")
      ?.getAttribute("stdDeviation");
    api.detach(el);
    const watcher = api.watch(other, ".watched");
    el.className = "";
    await new Promise((r) => setTimeout(r, 30));
    const classLoss = el.style.getPropertyValue("--hyalite") === "";
    watcher.stop();
    container.remove();
    other.remove();
    return {
      cold,
      warm,
      eviction,
      manualSurvives,
      handover,
      stopped,
      ramps,
      blur,
      classLoss,
      filters: document.querySelectorAll("filter").length,
    };
  });
  expect(result).toEqual({
    cold: 1,
    warm: 1,
    eviction: 1,
    manualSurvives: true,
    handover: true,
    stopped: true,
    ramps: 0,
    blur: "2",
    classLoss: true,
    filters: 1,
  });
});

test("reduced motion and non-Chromium detection preserve CSS fallback", async ({
  browser,
}) => {
  const reduced = await browser.newContext({ reducedMotion: "reduce" }),
    page = await reduced.newPage();
  await page.goto("/?fixture=1");
  await page.waitForFunction(() => window.__ready && window.__engine);
  await page.evaluate(() =>
    window.__configure({ opts: { materialize: 1000 }, revision: 1 }),
  );
  await page.waitForTimeout(80);
  await expect(page.locator('filter[id*="-m"]')).toHaveCount(0);
  await reduced.close();
  const unsupported = await browser.newContext();
  await unsupported.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", {
      value: { brands: [{ brand: "Unsupported", version: "1" }] },
    });
    Object.defineProperty(navigator, "userAgent", { value: "Unsupported/1" });
  });
  const p = await unsupported.newPage();
  await p.goto("/?fixture=1");
  await p.waitForFunction(() => window.__ready);
  await expect(p.locator(".frame-status")).toContainText("CSS fallback");
  await expect(p.locator("#card")).toHaveCSS("backdrop-filter", "blur(1px)");
  await expect(p.locator("filter")).toHaveCount(0);
  await unsupported.close();
});
