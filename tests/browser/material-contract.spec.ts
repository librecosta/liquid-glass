import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("candidate CSS works with own div/button/input layers and native fallback", async ({ page }) => {
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

test("material CSS is opt-in, leaves host positioning and application pseudos intact, and never owns optics", async ({ page }) => {
  await page.goto("/prototypes/material-contract.html");
  const violations = await page.evaluate(css => {
    const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
    const problems: string[] = [];
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) { problems.push("Unexpected at-rule"); continue; }
      if (!rule.selectorText.includes(".liquid-glass") || !rule.selectorText.includes("data-lg-material")) problems.push(rule.selectorText);
      for (const property of rule.style) {
        if (/filter|--hyalite/.test(property)) problems.push(property);
        if (!rule.selectorText.includes("::after") && !/^background(?:-|$)/.test(property)) problems.push(`Host layout or state: ${property}`);
      }
    }
    return problems;
  }, readFileSync("src/materials.css", "utf8"));
  expect(violations).toEqual([]);
  await page.addStyleTag({content: '.app-after::after { content: "Application decoration"; } .app-override { background: rgb(12, 34, 56); }'});
  await page.evaluate(() => {
    const cases = document.createElement("div");
    cases.innerHTML = `<div id="no-class" data-lg-material="soft"></div><div id="no-material" class="liquid-glass"></div><div id="unknown" class="liquid-glass" data-lg-material="unknown"></div>
      <div id="owned" class="liquid-glass app-after" data-lg-material="soft" style="position:fixed;left:4px;top:4px;width:123px;height:45px;border-radius:9px;overflow:visible;z-index:7;font-size:19px"></div>
      <div id="decorated" class="liquid-glass" data-lg-material="prismatic" data-lg-decorate style="position:absolute"></div>
      <div id="static" class="liquid-glass" data-lg-material="soft"></div>`;
    document.body.append(cases);
    document.body.dataset.lgTheme = "light";
  });
  for (const id of ["no-class", "no-material", "unknown"]) await expect(page.locator(`#${id}`)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const owned = page.locator("#owned");
  await expect(owned).toHaveCSS("background-color", "rgba(179, 201, 189, 0.07)");
  expect(await owned.evaluate(el => getComputedStyle(el, "::after").content)).toBe('"Application decoration"');
  await owned.evaluate(el => { (el as HTMLElement).dataset.lgTheme = "light"; });
  await expect(owned).toHaveCSS("background-color", "rgba(101, 130, 115, 0.06)");
  await owned.evaluate(el => { (el as HTMLElement).dataset.lgTheme = "dark"; el.classList.add("app-override"); });
  await expect(owned).toHaveCSS("background-color", "rgb(12, 34, 56)");
  for (const [property, value] of Object.entries({ position: "fixed", width: "123px", height: "45px", "border-radius": "9px", overflow: "visible", "z-index": "7", "font-size": "19px" })) await expect(owned).toHaveCSS(property, value);
  await expect(page.locator("#static")).toHaveCSS("position", "static");
  await expect(page.locator("#decorated")).toHaveCSS("position", "absolute");
  expect(await page.locator("#decorated").evaluate(el => ({content: getComputedStyle(el, "::after").content, pointer: getComputedStyle(el, "::after").pointerEvents}))).toEqual({content: '""', pointer: "none"});
});
