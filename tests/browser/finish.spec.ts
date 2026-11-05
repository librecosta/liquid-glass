import { test, expect } from "@playwright/test";
test("finish controls separate edge, saturation and rim without changing Reference", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__ready && window.__engine);
  await expect(page.locator(".quality-note")).toContainText("覆盖 edge=0");
  await expect(page.locator("#card")).toHaveCSS("box-shadow", "none");
  const state = await page.evaluate(() => ({
    edge: window.__engine.DEFAULTS.edge,
    rim: window.__engine.DEFAULTS.rim,
    map: window.__engine.info()!.map,
    ref: document.getElementById("card")!.style.getPropertyValue("--hyalite"),
  }));
  expect([state.edge, state.rim]).toEqual([0.32, 1.76]);
  await page.getByRole("button", { name: "Reference", exact: true }).click();
  await expect(page.locator("#card")).not.toHaveCSS("box-shadow", "none");
  for (const label of ["0", "0.08", "0.16", "0.32"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    expect(await page.evaluate(() => window.__engine.info()!.map)).toBe(
      state.map,
    );
    expect(
      await page
        .locator("#card")
        .evaluate((el) => el.style.getPropertyValue("--hyalite")),
    ).toBe(state.ref);
  }
  await page
    .getByRole("button", { name: "Optical Balanced（实验）", exact: true })
    .click();
  await expect(page.locator("#card")).toHaveCSS("box-shadow", "none");
  expect(await page.locator("filter feDisplacementMap").count()).toBe(3);
  expect(await page.locator("filter > *").count()).toBe(18);
  expect(await page.evaluate(() => window.__engine.info()!.map)).toBe(
    state.map,
  );
  await page
    .getByRole("combobox", { name: "样例", exact: true })
    .selectOption("controls");
  await page.locator("#native-input").fill("Clear foreground");
  await expect(page.locator("#native-input")).toHaveCSS("filter", "none");
  await expect(page.locator("#native-input")).toHaveCSS(
    "backdrop-filter",
    "none",
  );
  await expect(page.locator(".native-input-surface")).toHaveCSS(
    "pointer-events",
    "none",
  );
});
test("DIY Hook page keeps native forms, disabled, focus and clear foreground", async ({
  page,
}) => {
  await page.goto("/components.html");
  await expect(
    page.getByRole("heading", { name: "React Hook / DIY DOM" }),
  ).toBeVisible();
  await expect(page.locator(".demo-card").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
  const input = page.locator("#email");
  await input.fill("hello@example.com");
  await expect(input).toHaveCSS("filter", "none");
  await expect(input).toHaveCSS("backdrop-filter", "none");
  await expect(input).toHaveCSS("border-top-width", "0px");
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(page.locator("output")).toContainText("hello@example.com");
  const action = page.getByRole("button", { name: /原生点击/ });
  await action.focus();
  await action.press("Space");
  await expect(action).toHaveText("原生点击 1");
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.getByRole("checkbox", { name: "禁用示例按钮" }).check();
  await expect(action).toBeDisabled();
  await action.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(action).toHaveText("原生点击 1");
  await page
    .getByRole("checkbox", { name: "启用特效（独立于 disabled）" })
    .uncheck();
  await expect(page.locator("filter")).toHaveCount(0);
  await expect(page.locator(".demo-card").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
  await input.fill("still-editable@example.com");
});
