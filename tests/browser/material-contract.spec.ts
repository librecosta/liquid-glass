import { test, expect } from "@playwright/test";

test("draft optional CSS works with own div/button/input layers and native fallback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/prototypes/material-contract.html");
  await expect(page.locator("#status")).toHaveText("SVG refraction enabled");
  await page.locator("#theme").selectOption("light");
  await page.locator("#quality").selectOption("Fast");
  await expect.poll(async () => page.locator("filter").first().locator("feDisplacementMap").count()).toBe(1);
  await page.locator("#message").fill("My native input");
  await page.locator("#message").press("ControlOrMeta+A");
  expect(await page.locator("#message").evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(15);
  await page.locator("#action").click();
  await expect(page.locator("#counter")).toHaveText("Clicked 1 times");
  await page.locator("#disabled").check();
  await expect(page.locator("#action")).toBeDisabled();
  await page.locator("#enabled").uncheck();
  await expect(page.locator("#status")).toContainText("fallback");
  await expect(page.locator(".field > .liquid-glass")).toHaveCSS("backdrop-filter", "blur(1px)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator("#enabled").check();
  await expect(page.locator("#status")).toHaveText("SVG refraction enabled");
  await page.locator("#quality").selectOption("Balanced");
  await expect.poll(async () => page.locator("filter").first().locator("feDisplacementMap").count()).toBe(3);
});
