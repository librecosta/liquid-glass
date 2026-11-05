import { test, expect } from "@playwright/test";
import { instrument } from "../../scripts/perf-instrument.mjs";

for (const width of [390, 768, 1440, 1920])
  for (const language of ["en", "zh-CN"])
    for (const path of ["/", "/components.html"]) {
      test(`${path} ${language} has a usable, naturally scrolling layout at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${path}?lang=${language}`);
        await expect(page.locator("html")).toHaveAttribute("lang", language);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator(".properties")).toHaveCSS(
          "overflow-y",
          "visible",
        );
        await page.waitForTimeout(150);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        const preview = await page
          .locator(path === "/" ? "#scene" : ".demo-scene")
          .boundingBox();
        expect(preview!.width).toBeGreaterThan(
          width >= 1440 ? width * 0.64 : width * 0.8,
        );
        const violations = await page.locator(".site").evaluate((site) =>
          [
            ...site.querySelectorAll(
              "button, select, summary, label, h1, h2, .field-hint",
            ),
          ]
            .filter((el) => {
              if (!(el as HTMLElement).offsetParent) return false;
              const rect = el.getBoundingClientRect();
              return (
                rect.left < -1 ||
                rect.right > innerWidth + 1 ||
                el.scrollWidth > el.clientWidth + 2
              );
            })
            .map((el) => el.textContent?.slice(0, 80)),
        );
        expect(violations).toEqual([]);
        expect(errors).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(`site-${language}-${width}.png`),
          fullPage: true,
        });
        // The inspector must also fit when every advanced group is expanded.
        await page.locator("details").evaluateAll((groups) => {
          for (const group of groups) group.open = true;
        });
        await page.waitForTimeout(100);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        expect(
          await page
            .locator(".properties")
            .evaluate((panel) =>
              [...panel.querySelectorAll("label, summary, .field-hint")]
                .filter((el) => el.scrollWidth > el.clientWidth + 2)
                .map((el) => el.textContent),
            ),
        ).toEqual([]);
      });
    }

test("English default, persisted Chinese, shared URL priority, translated titles/ARIA and native feedback", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Liquid Glass — Playground");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("zh-CN");
  await expect(page).toHaveURL(/lang=zh-CN/);
  await expect(page).toHaveTitle("Liquid Glass — 交互舞台");
  await expect(page.getByRole("button", { name: "移动玻璃" })).toBeVisible();
  await page.goto("/components.html");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "自己的 DOM，添一点玻璃。",
  );
  await expect(page).toHaveTitle("Liquid Glass — Hook 示例");
  await page.getByRole("button", { name: "提交", exact: true }).click();
  expect(
    await page
      .locator("#email")
      .evaluate((el) => (el as HTMLInputElement).validationMessage),
  ).toBe("请输入有效邮箱地址。");
  await page.locator("#email").fill("hello@example.com");
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(page.locator("output")).toHaveText("已提交：hello@example.com");
  await page
    .getByRole("combobox", { name: "语言", exact: true })
    .selectOption("en");
  await expect(page.locator("output")).toHaveText(
    "Submitted: hello@example.com",
  );
  await page.goto("/?lang=zh-CN&quality=Fast");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(
    page.getByRole("button", { name: "Fast", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const context = await browser.newContext(),
    shared = await context.newPage();
  await shared.goto(page.url());
  await expect(shared.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(
    shared.getByRole("button", { name: "Fast", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await context.close();
});

test("keyboard controls, numeric/range synchronization, independent Hook options and translated upload errors", async ({
  page,
}) => {
  await page.goto("/?lang=en");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#content")).toBeFocused();
  const advanced = page
    .locator("summary")
    .filter({ hasText: "Advanced optics" });
  await advanced.focus();
  await advanced.press("Enter");
  await expect(advanced.locator("..")).toHaveAttribute("open", "");
  const range = page.getByRole("slider", { name: "Width", exact: true });
  const number = page.getByRole("spinbutton", {
    name: "Width (value)",
    exact: true,
  });
  await number.fill("");
  await number.pressSequentially("360");
  await expect(range).toHaveValue("360");
  await number.fill("9999");
  await number.press("Tab");
  expect(Number(await number.inputValue())).toBeLessThan(9999);
  await number.fill("360");
  await range.focus();
  await range.press("ArrowRight");
  await expect(number).toHaveValue("361");
  await expect(range).toHaveCSS("outline-style", "solid");
  await page.locator("summary").filter({ hasText: "Light & color" }).click();
  const light = page.getByRole("spinbutton", {
    name: "Light direction (value)",
    exact: true,
  });
  await light.fill("");
  await light.pressSequentially("-45");
  await light.press("Enter");
  await expect(light).toHaveValue("-45");
  await page.getByRole("button", { name: "Fast", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("filter feDisplacementMap")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Background", exact: true })
    .selectOption("image");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".upload-field [role=status]")).toHaveText(
    "This image could not be opened. Choose another image file.",
  );
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("zh-CN");
  await expect(page.locator(".upload-field [role=status]")).toHaveText(
    "无法打开这张图片，请选择其他图片文件。",
  );
  await page.goto("/components.html?lang=en");
  const cards = page.locator(".demo-card");
  const right = await cards
    .nth(1)
    .evaluate((el) => el.style.getPropertyValue("--hyalite"));
  await page
    .getByRole("spinbutton", { name: "Left card bevel (value)" })
    .fill("48");
  expect(
    await cards.nth(1).evaluate((el) => el.style.getPropertyValue("--hyalite")),
  ).toBe(right);
  expect(
    await cards.nth(0).evaluate((el) => el.style.getPropertyValue("--hyalite")),
  ).not.toBe(right);
  await page.getByRole("button", { name: "Focus input", exact: true }).click();
  await expect(page.locator("#email")).toBeFocused();
  await page.locator("#email").fill("native@example.com");
  await page.locator("#email").press("Tab");
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeFocused();
});

for (const width of [390, 1440])
  test(`responsive five-card drag keeps warm maps and commits once at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(instrument);
    await page.goto("/?lang=en");
    await page.waitForFunction(() => window.__ready && window.__engine);
    await page
      .getByRole("combobox", { name: "Instances", exact: true })
      .selectOption("5");
    for (const name of ["Fast", /^Balanced/])
      await page
        .getByRole("button", { name, exact: typeof name === "string" })
        .click();
    await page.waitForTimeout(200);
    const handle = page.getByRole("button", { name: "Move glass" }),
      box = (await handle.boundingBox())!;
    const initial = await page.evaluate(() => ({
      x: window.__scene.x,
      y: window.__scene.y,
      filter: document
        .getElementById("card")!
        .style.getPropertyValue("--hyalite"),
    }));
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.evaluate(() => window.__startPerf(false));
    await page.mouse.down();
    expect(await handle.evaluate((el) => el.hasPointerCapture(1))).toBe(true);
    await page.mouse.move(box.x + 22, box.y + 30, { steps: 15 });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => [window.__scene.x, window.__scene.y]))
      .toEqual([initial.x + 12, initial.y + 20]);
    const result = await page.evaluate(() => window.__stopPerf());
    expect(result.commitHook).toBe(true);
    expect({
      maps: result.maps,
      png: result.png.length,
      resize: result.ro,
      commits: result.commits,
    }).toEqual({ maps: 0, png: 0, resize: 0, commits: 1 });
    expect(
      await page
        .locator("#card")
        .evaluate((el) => el.style.getPropertyValue("--hyalite")),
    ).toBe(initial.filter);
  });
