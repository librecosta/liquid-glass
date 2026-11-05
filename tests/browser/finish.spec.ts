import { test, expect } from "@playwright/test";
test("finish controls separate CSS outline from the historical optical highlight", async ({
  page,
}) => {
  await page.goto("/?lang=en");
  await page.waitForFunction(() => window.__ready && window.__engine);
  await expect(page.locator(".quality-note")).toContainText("library default");
  await expect(page.locator("#card")).toHaveCSS("box-shadow", "none");
  expect(
    await page.evaluate(() => [
      window.__engine.DEFAULTS.edge,
      window.__engine.DEFAULTS.rim,
    ]),
  ).toEqual([0, 0.8]);
  await page
    .getByRole("button", { name: "Reference (historical)", exact: true })
    .click();
  await page.getByText("Light & color", { exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Optical highlight", exact: true }),
  ).toHaveValue("1.76");
  const reference = await page.evaluate(() => ({
    map: window.__engine.info()!.map,
    ref: document.getElementById("card")!.style.getPropertyValue("--hyalite"),
  }));
  for (const edge of [0, 0.08, 0.16, 0.32]) {
    await page
      .getByRole("spinbutton", { name: "CSS outline (value)", exact: true })
      .fill(String(edge));
    expect(await page.evaluate(() => window.__engine.info()!.map)).toBe(
      reference.map,
    );
    expect(
      await page
        .locator("#card")
        .evaluate((el) => el.style.getPropertyValue("--hyalite")),
    ).toBe(reference.ref);
  }
  await page.getByText("Advanced optics", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Historical comparisons", exact: true })
    .selectOption("optical");
  await expect(page.locator("#card")).toHaveCSS("box-shadow", "none");
  expect(await page.locator("filter feDisplacementMap").count()).toBe(3);
  expect(await page.locator("filter > *").count()).toBe(18);
  expect(await page.evaluate(() => window.__engine.info()!.map)).toBe(
    reference.map,
  );
  await page
    .getByRole("combobox", { name: "Content", exact: true })
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
  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Balanced/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const [name, value] of [
    ["Dispersion", "0.8"],
    ["Edge saturation", "1"],
    ["CSS outline", "0"],
    ["Optical highlight", "0.8"],
  ])
    await expect(page.getByRole("slider", { name, exact: true })).toHaveValue(
      value,
    );
});
test("DIY Hook page keeps native forms, disabled, keyboard focus and clear foreground", async ({
  page,
}) => {
  await page.goto("/components.html?lang=en");
  await expect(
    page.getByRole("heading", { name: "Your DOM. A little glass." }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Quality", exact: true }),
  ).toHaveValue("Balanced");
  await expect(page.locator(".demo-card").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
  const input = page.locator("#email");
  await input.fill("hello@example.com");
  await expect(input).toHaveCSS("filter", "none");
  await expect(input).toHaveCSS("backdrop-filter", "none");
  await expect(input).toHaveCSS("border-top-width", "0px");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator("output")).toContainText("hello@example.com");
  const action = page.getByRole("button", { name: /Native click/ });
  await action.focus();
  await action.press("Space");
  await expect(action).toHaveText("Native click 1");
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.getByRole("checkbox", { name: "Disable example buttons" }).check();
  await expect(action).toBeDisabled();
  await action.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(action).toHaveText("Native click 1");
  await page.getByRole("checkbox", { name: "Enable glass effect" }).uncheck();
  await expect(page.locator("filter")).toHaveCount(0);
  await expect(page.locator(".demo-card").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
  await input.fill("still-editable@example.com");
});
