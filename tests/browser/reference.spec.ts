import { test, expect, chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
const gold = JSON.parse(readFileSync("tests/golden/reference.json", "utf8"));
declare global {
  interface Window {
    __violations: string[];
  }
}
test("Reference keeps b257c17 mathematical/map/SVG/pixel gold on forest and grid", async ({}, testInfo) => {
  // Match the original gold capture's fresh Chrome process. Chrome's JPEG decode
  // cache can change resampling by a few channel values across reused contexts.
  const browser = await chromium.launch(testInfo.project.use.launchOptions);
  const page = await browser.newPage({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 500, height: 516 },
    deviceScaleFactor: 1,
  });
  try {
    await page.goto("/?fixture=1&quality=Reference");
    await page.waitForFunction(() => window.__ready && window.__engine);
    mkdirSync("test-results/reference", { recursive: true });
    for (const { name, patch, digest } of gold.results) {
      await page.evaluate((p) => window.__configure(p), patch);
      await page.waitForTimeout(180);
      const state = await page.evaluate(() => {
        const r = document
          .getElementById("card")!
          .style.getPropertyValue("--hyalite");
        const f = document.querySelector(r.slice(4, -1))!;
        return {
          info: window.__engine.info(),
          graph: f.outerHTML.replace(/liquid-glass-\d+/g, "FILTER"),
          edge: document
            .getElementById("card")!
            .style.getPropertyValue("--hyalite-edge"),
        };
      });
      expect(
        createHash("sha256").update(JSON.stringify(state)).digest("hex"),
        name + " map/graph",
      ).toBe(digest);
      const expected = PNG.sync.read(
        readFileSync(`tests/golden/reference/${name}.png`),
      );
      const actual = PNG.sync.read(
        await page
          .locator("#scene")
          .screenshot({ path: `test-results/reference/${name}.png` }),
      );
      const diff = new PNG({ width: 500, height: 480 });
      const pixels = pixelmatch(
        expected.data,
        actual.data,
        diff.data,
        500,
        480,
        {
          threshold: 0,
          includeAA: true,
        },
      );
      if (pixels)
        writeFileSync(
          `test-results/reference/${name}-diff.png`,
          PNG.sync.write(diff),
        );
      expect(pixels, name + " pixels / Chrome " + browser.version()).toBe(0);
    }
  } finally {
    await browser.close();
  }
});
test("single engine, local forest, real drag/cancel/keyboard, qualities, resize and upload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.__ready && window.__scene);
  expect(await page.locator("iframe").count()).toBe(0);
  expect(await page.locator("svg").count()).toBe(1);
  await expect(
    page.getByRole("button", { name: "Balanced（默认）", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#scene")).toHaveCSS("background-image", /forest/);
  const card = page.locator("#card"),
    initial = await card.evaluate((el) =>
      el.style.getPropertyValue("--hyalite"),
    );
  const handle = page.getByRole("button", { name: "移动卡片" }),
    box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 40, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator("#position")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 160, 172)",
  );
  expect(
    await card.evaluate((el) => el.style.getPropertyValue("--hyalite")),
  ).toBe(initial);
  await handle.press("ArrowLeft");
  await expect(page.locator("#position")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 150, 172)",
  );
  // Exercise real pointer capture, a clamped move, then cancellation before release.
  const cancelBox = (await handle.boundingBox())!;
  await page.mouse.move(cancelBox.x + 10, cancelBox.y + 10);
  await page.mouse.down();
  expect(await handle.evaluate((el) => el.hasPointerCapture(1))).toBe(true);
  await page.mouse.move(1400, 900);
  await handle.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator("#position")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 200, 260)",
  );
  expect(await handle.evaluate((el) => el.hasPointerCapture(1))).toBe(false);
  await page.mouse.move(800, 600);
  await expect
    .poll(() => page.evaluate(() => [window.__scene.x, window.__scene.y]))
    .toEqual([200, 260]);
  await page.getByRole("button", { name: "Fast（性能优先）", exact: true }).click();
  await expect(page.locator(".quality-note")).toContainText("单通道");
  expect(await page.locator("filter feDisplacementMap").count()).toBe(1);
  await page.getByRole("button", { name: "Reference（历史参考）", exact: true }).click();
  expect(await page.locator("filter feDisplacementMap").count()).toBe(3);
  await page
    .getByRole("combobox", { name: "样例", exact: true })
    .selectOption("controls");
  await page.locator("#native-input").fill("Native input");
  await page.locator("#native-button").click();
  await expect(page.locator("#native-button")).toHaveText("点击计数 1");
  await page.getByRole("checkbox", { name: "模拟不支持 SVG 折射" }).check();
  await expect(card).toHaveCSS("backdrop-filter", "blur(1px)");
  expect(await page.locator("filter").count()).toBe(0);
  await page
    .getByRole("combobox", { name: "背景", exact: true })
    .selectOption("image");
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/background.svg");
  await expect(page.locator("#scene")).toHaveCSS("background-image", /blob:/);
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(card).toHaveCSS("width", "300px");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect(errors).toEqual([]);
});

test("local forest and data maps work with explicit image CSP permissions", async ({
  page,
}) => {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": "img-src 'self' data: blob:",
      },
    });
  });
  await page.addInitScript(() => {
    window.__violations = [];
    addEventListener("securitypolicyviolation", (e) =>
      window.__violations.push(e.blockedURI),
    );
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__ready && window.__engine);
  await expect(page.locator("filter")).toHaveCount(1);
  expect(
    await page.locator("filter feImage").first().getAttribute("href"),
  ).toMatch(/^data:image\/png/);
  await expect(page.locator("#scene")).toHaveCSS("background-image", /forest/);
  expect(await page.evaluate(() => window.__violations)).toEqual([]);
  await page.getByRole("checkbox", { name: "模拟不支持 SVG 折射" }).check();
  await expect(page.locator("#card")).toHaveCSS("backdrop-filter", "blur(1px)");
});

test("Reference live and settle resizes retain valid SVG references through every frame", async ({
  page,
}) => {
  await page.goto("/?fixture=1&quality=Reference");
  await page.waitForFunction(() => window.__ready && window.__engine);
  for (const settle of [0, 120]) {
    await page.evaluate(
      (settle) =>
        window.__configure({
          width: 214,
          opts: { settle },
          revision: settle + 1,
        }),
      settle,
    );
    await page.waitForTimeout(50);
    const invalid = await page.evaluate(async (settle) => {
      const el = document.getElementById("card")!;
      let invalid = 0;
      const inspect = () => {
        const ref = el.style.getPropertyValue("--hyalite");
        if (
          !ref.startsWith("url(") ||
          !document.querySelector(ref.slice(4, -1)) ||
          !getComputedStyle(el).backdropFilter.includes("url(")
        )
          invalid++;
      };
      for (let i = 0; i < 30; i++) {
        el.style.width = `${214 + i * 3}px`;
        await new Promise((r) => requestAnimationFrame(r));
        inspect();
      }
      await new Promise((r) => setTimeout(r, settle + 160));
      inspect();
      return invalid;
    }, settle);
    expect(invalid, `settle=${settle}`).toBe(0);
  }
});
