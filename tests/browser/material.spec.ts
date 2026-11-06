import { test, expect } from "@playwright/test";
import { instrument } from "../../scripts/perf-instrument.mjs";

test("material skins preserve optics, bindings, maps and native input state at every quality", async ({ page }) => {
  await page.addInitScript(instrument);
  await page.goto("/?lang=en&background=light");
  await page.waitForFunction(() => window.__ready);
  await page.getByRole("combobox", { name: "Content", exact: true }).selectOption("controls");
  for (const quality of ["Balanced", "Fast", "Reference"] as const) {
    await page.getByRole("group", { name: "Quality", exact: true }).getByRole("button", { name: new RegExp(`^${quality}`) }).click();
    await page.getByRole("spinbutton", { name: "Thickness (value)", exact: true }).fill("71");
    await page.locator("#native-input").fill("Native text stays");
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      (window as any).__materialBefore = {
        opts: window.__scene.opts,
        card: document.getElementById("card"),
        input: document.getElementById("native-input"),
        filters: [...document.querySelectorAll("filter")],
        svg: [...document.querySelectorAll("filter")].map((f) => f.outerHTML),
      };
      window.__startPerf(false);
    });
    for (const name of ["Soft", "Prismatic", "Clear"]) {
      const button = page.getByRole("group", { name: "Material", exact: true }).getByRole("button", { name, exact: true });
      await button.focus();
      await button.press("Space");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#native-input")).toHaveValue("Native text stays");
    }
    const result = await page.evaluate(() => {
      const before = (window as any).__materialBefore;
      const perf = window.__stopPerf();
      return {
        maps: perf.maps, png: perf.png.length,
        quality: window.__scene.quality,
        optsSame: before.opts === window.__scene.opts,
        domSame: before.card === document.getElementById("card") && before.input === document.getElementById("native-input"),
        filtersSame: before.filters.every((f: Element, i: number) => f === document.querySelectorAll("filter")[i]),
        svgSame: JSON.stringify(before.svg) === JSON.stringify([...document.querySelectorAll("filter")].map((f) => f.outerHTML)),
      };
    });
    expect(result).toEqual({ maps: 0, png: 0, quality, optsSame: true, domSame: true, filtersSame: true, svgSame: true });
  }
});

test("URL/default/reset and a reversible, separately enabled optical trial", async ({ page }) => {
  await page.goto("/?lang=en&material=prismatic&quality=Fast&background=dark");
  await expect(page.locator(".public-scene")).toHaveAttribute("data-material", "prismatic");
  await expect(page.locator("filter feDisplacementMap")).toHaveCount(1);
  await page.getByRole("spinbutton", { name: "Bevel (value)", exact: true }).fill("53");
  await page.locator("summary").filter({ hasText: "Advanced optics" }).click();
  const before = await page.evaluate(() => JSON.stringify(window.__scene));
  const trial = page.getByRole("checkbox", { name: "Try recommended optics (experiment)", exact: true });
  await trial.check();
  await expect(page.getByRole("spinbutton", { name: "Bevel (value)", exact: true })).toHaveValue("42");
  await expect(page.locator("filter feDisplacementMap")).toHaveCount(3);
  expect(await page.evaluate(() => JSON.stringify(window.__scene))).toBe(before);
  await page.getByRole("spinbutton", { name: "Bevel (value)", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(trial).toBeChecked();
  expect(await page.evaluate(() => JSON.stringify(window.__scene))).toBe(before);
  await page.getByRole("button", { name: "Soft", exact: true }).click();
  await expect(trial).toBeChecked();
  await trial.uncheck();
  await expect(page.getByRole("spinbutton", { name: "Bevel (value)", exact: true })).toHaveValue("53");
  await expect(page.locator("filter feDisplacementMap")).toHaveCount(1);
  expect(await page.evaluate(() => JSON.stringify(window.__scene))).toBe(before);
  await page.reload();
  await expect(page.locator(".public-scene")).toHaveAttribute("data-material", "soft");
  await page.locator("summary").filter({ hasText: "Advanced optics" }).click();
  await expect(trial).not.toBeChecked();
  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  await expect(page.locator(".public-scene")).toHaveAttribute("data-material", "clear");
  await expect(page.locator("#scene")).toHaveClass("scene forest");
  expect(await page.evaluate(() => ({ quality: window.__scene.quality, opts: window.__scene.opts }))).toEqual({ quality: "Balanced", opts: {} });
  await page.goto("/?lang=en&material=invalid&quality=invalid&background=invalid");
  await expect(page.locator(".public-scene")).toHaveAttribute("data-material", "clear");
  await expect(page.locator("#scene")).toHaveClass("scene forest");
});

for (const language of ["en", "zh-CN"] as const)
  test(`${language}: all skins on light/dark backdrops keep mobile native controls, upload, drag and fallback`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(`/?lang=${language}&background=light`);
    const zh = language === "zh-CN";
    await page.getByRole("combobox", { name: zh ? "内容" : "Content", exact: true }).selectOption("controls");
    for (const background of ["light", "dark"]) {
      await page.getByRole("combobox", { name: zh ? "背景" : "Background", exact: true }).selectOption(background);
      for (const name of zh ? ["Clear（清透）", "Soft（柔光）", "Prismatic（棱彩）"] : ["Clear", "Soft", "Prismatic"]) {
        await page.getByRole("button", { name, exact: true }).click();
        const input = page.locator("#native-input");
        await input.fill("Glass / 玻璃");
        await input.press("ControlOrMeta+A");
        expect(await input.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(10);
        await expect(input).toBeFocused();
        const button = page.locator("#native-button");
        const text = await button.textContent();
        await button.click();
        await expect(button).not.toHaveText(text!);
        await page.getByRole("checkbox", { name: zh ? "禁用示例按钮" : "Disable example buttons", exact: true }).check();
        await expect(button).toBeDisabled();
        await page.getByRole("checkbox", { name: zh ? "禁用示例按钮" : "Disable example buttons", exact: true }).uncheck();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
        expect(await input.evaluate((el) => getComputedStyle(el).color)).toBe(background === "light" ? "rgb(20, 47, 52)" : "rgb(255, 255, 255)");
      }
    }
    const handle = page.getByRole("button", { name: zh ? "移动玻璃" : "Move glass", exact: true });
    await handle.scrollIntoViewIfNeeded();
    const position = await page.evaluate(() => [window.__scene.x, window.__scene.y]);
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 15, box.y + 25, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => [window.__scene.x, window.__scene.y])).toEqual([position[0] + 5, position[1] + 15]);
    await page.locator("summary").filter({ hasText: zh ? "高级光学" : "Advanced optics" }).click();
    await page.getByRole("checkbox", { name: zh ? "预览 CSS 回退" : "Preview CSS fallback", exact: true }).check();
    await expect(page.locator("#card")).toHaveCSS("backdrop-filter", "blur(1px)");
    await page.locator("#native-input").fill("Fallback stays native");
    await expect(page.locator("#native-input")).toHaveValue("Fallback stays native");
    await page.getByRole("combobox", { name: zh ? "背景" : "Background", exact: true }).selectOption("image");
    await page.locator("input[type=file]").setInputFiles("tests/fixtures/background.svg");
    await expect(page.locator(".upload-field [role=status]")).toContainText("background.svg");
    const original = await page.evaluate(() => window.__scene.image);
    await page.getByRole("button", { name: zh ? "Soft（柔光）" : "Soft", exact: true }).click();
    expect(await page.evaluate(() => window.__scene.image)).toBe(original);
  });

test("material/background URL parameters do not touch the historical fixture", async ({ page }) => {
  await page.goto("/?fixture=1&quality=Reference&material=soft&background=light&softVariant=clearer");
  await page.waitForFunction(() => window.__ready);
  await expect(page.locator("[data-material], [data-tone], [data-soft-variant], .material-toolbar")).toHaveCount(0);
  await expect(page.locator("#scene")).toHaveClass("scene forest");
  expect(await page.locator("#card").evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none");
  expect(await page.evaluate(() => window.__scene.quality)).toBe("Reference");
});

for (const language of ["en", "zh-CN"] as const)
  test(`${language}: Soft uses Clearer, removes the A/B UI and safely normalizes old URLs`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    const zh = language === "zh-CN";
    for (const variant of ["current", "clearer", "invalid"]) {
      await page.goto(`/?lang=${language}&material=soft&quality=Fast&background=light&softVariant=${variant}`);
      await expect(page.locator("#card")).toHaveCSS("background-color", "rgba(101, 130, 115, 0.06)");
      await expect(page.getByRole("group", { name: zh ? "Soft 对照" : "Soft A/B", exact: true })).toHaveCount(0);
      await expect(page).not.toHaveURL(/softVariant=/);
    }
    await page.getByRole("combobox", { name: zh ? "背景" : "Background", exact: true }).selectOption("dark");
    await expect(page.locator("#card")).toHaveCSS("background-color", "rgba(179, 201, 189, 0.07)");
    await page.getByRole("button", { name: zh ? "全部重置" : "Reset all", exact: true }).click();
    await expect(page.locator(".public-scene")).toHaveAttribute("data-material", "clear");
    await page.getByRole("button", { name: zh ? "Soft（柔光）" : "Soft", exact: true }).click();
    await expect(page.locator("#card")).toHaveCSS("background-color", "rgba(179, 201, 189, 0.07)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });

test("public instance URLs mount the requested count; fixtures ignore the new parameter", async ({ page }) => {
  await page.goto("/?lang=en&instances=20&quality=Fast&background=grid");
  await expect(page.locator(".card")).toHaveCount(20);
  await page.goto("/?fixture=1&instances=20");
  await expect(page.locator(".card")).toHaveCount(1);
});
