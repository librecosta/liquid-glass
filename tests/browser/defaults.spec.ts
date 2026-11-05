import { test, expect, chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

test("Balanced/Fast keep the C3 visual baselines before and after quality switching", async ({}, testInfo) => {
  test.skip(process.env.LG_EXACT_PIXELS === "0" || (process.platform !== "win32" && process.env.LG_EXACT_PIXELS !== "1"), "Exact Windows Chrome pixels are platform-specific; portable map/SVG contracts run everywhere.");
  mkdirSync("test-results/c3", {recursive: true});
  for (const quality of ["Balanced", "Fast"]) {
    // Fresh process matches fixture JPEG decode/resampling, as with Reference.
    const browser = await chromium.launch(testInfo.project.use.launchOptions);
    const page = await browser.newPage({
      baseURL: testInfo.project.use.baseURL, viewport: {width: 500, height: 516}, deviceScaleFactor: 1,
    });
    try {
      // No quality option for Balanced: verify the actual unconfigured first paint.
      await page.goto(`/?fixture=1${quality === "Fast" ? "&quality=Fast" : ""}`);
      await page.waitForFunction(() => window.__ready && window.__engine);
      for (const background of ["forest", "grid"] as const) {
        for (const switched of [false, true]) {
          await page.evaluate(({quality, background, switched}) => {
            if (switched) window.__configure({quality: "Reference", opts: {}});
            else window.__configure({background});
          }, {quality, background, switched});
          if (switched) {
            await page.waitForTimeout(30);
            await page.evaluate(quality => window.__configure({quality, opts: {}}), quality as "Balanced" | "Fast");
          }
          await page.waitForTimeout(180);
          const actual = PNG.sync.read(await page.locator("#scene").screenshot());
          const expected = PNG.sync.read(readFileSync(`tests/golden/c3/${quality.toLowerCase()}-${background}.png`));
          const diff = new PNG({width: 500, height: 480});
          const pixels = pixelmatch(expected.data, actual.data, diff.data, 500, 480, {threshold: 0, includeAA: true});
          if (pixels) writeFileSync(`test-results/c3/${quality}-${background}-${switched}-diff.png`, PNG.sync.write(diff));
          expect(pixels, `${quality}/${background}/switched=${switched}`).toBe(0);
          await expect(page.locator("#card")).toHaveCSS("box-shadow", "none");
          expect(await page.locator("filter feDisplacementMap").count()).toBe(quality === "Fast" ? 1 : 3);
          expect(await page.locator("filter > *").count()).toBe(quality === "Fast" ? 11 : 18);
        }
      }
    } finally {
      await browser.close();
    }
  }
});
