// Production HTML, assets, navigation and query parameters at root and Pages base.
// Local preview servers only: this script never enables Pages or deploys anything.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { preview } from "vite";
import { readRenderState, renderDigest } from "../tests/render-contract.mjs";

if (!process.env.npm_execpath || !existsSync("dist-playground/index.html"))
  throw Error("Run npm run build, then npm run test:distribution");
const pagesBuild = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "run", "build:pages"],
  { stdio: "inherit", windowsHide: true },
);
assert.equal(pagesBuild.status, 0, "Pages static build");
const gold = JSON.parse(
  readFileSync("tests/golden/render-contracts.json", "utf8"),
);
const browser = await chromium.launch({
  ...(process.env.LG_CHROME
    ? { executablePath: process.env.LG_CHROME }
    : process.env.LG_BROWSER === "chromium"
      ? {}
      : { channel: "chrome" }),
  args: ["--disable-background-networking"],
});
const rows = [];
try {
  for (const [base, outDir] of [
    ["/", "dist-playground"],
    ["/liquid-glass/", "dist-pages"],
  ]) {
    const server = await preview({
      base,
      build: { outDir },
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    });
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    try {
      for (const width of [390, 1440])
        for (const language of ["en", "zh-CN"]) {
          const context = await browser.newContext({
            viewport: { width, height: 1040 },
            permissions: ["clipboard-read", "clipboard-write"],
          });
          try {
            const page = await context.newPage(),
              errors = [];
            const zh = language === "zh-CN";
            const labels = zh
              ? {
                  move: "移动玻璃",
                  hook: "Hook 示例",
                  language: "语言",
                  quality: "画质",
                  submit: "提交",
                }
              : {
                  move: "Move glass",
                  hook: "Hook examples",
                  language: "Language",
                  quality: "Quality",
                  submit: "Submit",
                };
            page.on("pageerror", (e) => errors.push(e.message));
            page.on("requestfailed", (r) =>
              errors.push(
                `${r.method()} ${r.url()}: ${r.failure()?.errorText}`,
              ),
            );
            page.on("response", (r) => {
              if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
            });
            await page.goto(`${origin}${base}?lang=${language}&quality=Fast`);
            await page.waitForFunction(() => window.__ready && window.__engine);
            await expect(page.locator("html")).toHaveAttribute(
              "lang",
              language,
            );
            await expect(page).toHaveTitle(
              zh ? "Liquid Glass — 交互舞台" : "Liquid Glass — Playground",
            );
            await expect(
              page.getByRole("button", { name: "Fast", exact: true }),
            ).toHaveAttribute("aria-pressed", "true");
            await expect(page.locator("#scene")).toHaveCSS(
              "background-image",
              /forest/,
            );
            await expect(page.locator("filter feDisplacementMap")).toHaveCount(
              1,
            );
            await page.getByRole("button", { name: /^Balanced/ }).click();
            await expect(page.locator("filter feDisplacementMap")).toHaveCount(
              3,
            );
            await expect
              .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth),
              )
              .toBe(width);
            await page.waitForTimeout(100);
            const handle = page.getByRole("button", { name: labels.move }),
              box = await handle.boundingBox();
            const start = await page.evaluate(() => [
              window.__scene.x,
              window.__scene.y,
            ]);
            await page.mouse.move(box.x + 10, box.y + 10);
            await page.mouse.down();
            assert.equal(
              await handle.evaluate((el) => el.hasPointerCapture(1)),
              true,
            );
            await page.mouse.move(box.x + 22, box.y + 22, { steps: 5 });
            await page.mouse.up();
            await expect
              .poll(() =>
                page.evaluate(() => [window.__scene.x, window.__scene.y]),
              )
              .toEqual(start.map((n) => n + 12));
            // Navigation must remain inside the repository subpath and retain language.
            const hookLink = page
              .getByRole("navigation")
              .getByRole("link", { name: labels.hook, exact: true });
            await expect(hookLink).toHaveAttribute(
              "href",
              `${base}components.html?lang=${language}`,
            );
            await hookLink.click();
            await expect(page).toHaveURL(
              `${origin}${base}components.html?lang=${language}`,
            );
            await expect(page.locator("html")).toHaveAttribute(
              "lang",
              language,
            );
            await page.goto(
              `${origin}${base}components.html?lang=${language}&quality=Fast`,
            );
            await expect(
              page.getByRole("combobox", { name: labels.quality, exact: true }),
            ).toHaveValue("Fast");
            await page
              .getByRole("combobox", { name: labels.quality, exact: true })
              .selectOption("Balanced");
            await page.locator("#email").fill("distribution@example.com");
            await page
              .getByRole("button", { name: labels.submit, exact: true })
              .click();
            await expect(page.locator("output")).toHaveText(
              zh
                ? "已提交：distribution@example.com"
                : "Submitted: distribution@example.com",
            );
            await page
              .getByRole("combobox", { name: labels.language, exact: true })
              .selectOption(zh ? "en" : "zh-CN");
            await expect(page).toHaveTitle(
              zh ? "Liquid Glass — Hook examples" : "Liquid Glass — Hook 示例",
            );
            await expect
              .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth),
              )
              .toBe(width);
            const brand = page.locator("a.brand");
            await expect(brand).toHaveAttribute(
              "href",
              `${base}?lang=${zh ? "en" : "zh-CN"}`,
            );
            await brand.click();
            await expect(page).toHaveURL(
              `${origin}${base}?lang=${zh ? "en" : "zh-CN"}`,
            );
            assert.deepEqual(
              errors,
              [],
              `${base} ${language} ${width}px: no script/asset/navigation failures`,
            );
            rows.push({
              base,
              width,
              language,
              pages: ["index.html", "components.html"],
              passed: true,
            });
          } finally {
            await context.close();
          }
        }
      const context = await browser.newContext({
        viewport: { width: 500, height: 516 },
        deviceScaleFactor: 1,
      });
      try {
        const page = await context.newPage();
        await page.goto(
          `${origin}${base}?fixture=1&quality=Reference&lang=zh-CN`,
        );
        await page.waitForFunction(() => window.__ready && window.__engine);
        await expect(page.locator("#scene")).toHaveCSS("width", "500px");
        await expect(page.locator("#scene")).toHaveCSS("height", "480px");
        await expect(page.locator(".site")).toHaveCount(0);
        assert.equal(
          renderDigest(await readRenderState(page)),
          gold.results[0].digest,
          `${base} built Reference fixture`,
        );
      } finally {
        await context.close();
      }
    } finally {
      await new Promise((resolve, reject) =>
        server.httpServer.close((e) => (e ? reject(e) : resolve())),
      );
    }
  }
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/distribution.json",
    JSON.stringify(
      { browser: browser.version(), rows, referenceFixtures: 2 },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Production distribution: root + /liquid-glass/, both entries/languages at 390/1440px, native drag/forms, assets and fixed Reference contracts passed; no deployment",
  );
} finally {
  await browser.close();
}
