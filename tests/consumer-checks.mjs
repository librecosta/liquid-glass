import { expect } from "@playwright/test";

export async function verifyConsumerBrowser(
  browser,
  url,
  { strictMode = false } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    const resources = {
      resize: new Set(),
      mutation: new Set(),
      frames: new Set(),
    };
    const RO = window.ResizeObserver,
      MO = window.MutationObserver;
    window.ResizeObserver = class extends RO {
      observe(...args) {
        resources.resize.add(this);
        return super.observe(...args);
      }
      disconnect() {
        resources.resize.delete(this);
        return super.disconnect();
      }
    };
    window.MutationObserver = class extends MO {
      observe(...args) {
        // Count library radius observers; Vite's dev client owns a separate document observer.
        if (args[1]?.attributeFilter?.join(",") === "class,style")
          resources.mutation.add(this);
        return super.observe(...args);
      }
      disconnect() {
        resources.mutation.delete(this);
        return super.disconnect();
      }
    };
    const raf = requestAnimationFrame.bind(window),
      cancel = cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => {
      const id = raf((t) => {
        resources.frames.delete(id);
        fn(t);
      });
      resources.frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      resources.frames.delete(id);
      cancel(id);
    };
    window.resources = () =>
      Object.fromEntries(
        Object.entries(resources).map(([k, v]) => [k, v.size]),
      );
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      window.probe &&
      document
        .getElementById("a")
        ?.style.getPropertyValue("--hyalite")
        .startsWith("url"),
  );
  const ref = (id) =>
    page
      .locator("#" + id)
      .evaluate((el) => el.style.getPropertyValue("--hyalite"));
  const builds = () => page.evaluate(() => window.probe.builds());
  const b = await ref("b");
  expect(await ref("a")).toBe(b);
  expect(
    await page.evaluate(() => {
      const r = window.probe.refs();
      return (
        r.card === document.getElementById("a") &&
        r.button instanceof HTMLButtonElement &&
        r.input instanceof HTMLInputElement
      );
    }),
  ).toBe(true);
  if (strictMode)
    expect(
      await page.evaluate(() => window.probe.cleanupCalls()),
    ).toBeGreaterThan(0);
  const aBuilds = await builds();
  await page.getByRole("button", { name: "Update A", exact: true }).click();
  await expect.poll(() => ref("a")).not.toBe(b);
  expect(await ref("b")).toBe(b);
  expect(await builds()).toBe(aBuilds + 1);
  const a = await ref("a"),
    repeated = await builds();
  await page.getByRole("button", { name: "Update A", exact: true }).click();
  expect(await ref("a")).toBe(a);
  expect(await builds()).toBe(repeated);
  await page.evaluate(() => window.probe.legacySet({ thickness: 200 }));
  expect(await ref("a")).toBe(a);
  expect(await ref("b")).toBe(b);
  const action = page.locator("#action"),
    hoverBuilds = await builds();
  await action.hover();
  await action.click();
  await action.press("Space");
  await expect(action).toHaveText("Action 2");
  expect(await builds()).toBe(hoverBuilds);
  await page
    .getByRole("button", { name: "Toggle disabled", exact: true })
    .click();
  await expect(action).toBeDisabled();
  await action.evaluate((el) => el.click());
  await expect(action).toHaveText("Action 2");
  const field = page.locator("#controlled");
  await page.getByRole("button", { name: "Focus input", exact: true }).click();
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("placeholder", "Your email");
  await expect(field).toHaveAttribute("autocomplete", "email");
  await field.pressSequentially("hello@example.com");
  await expect(field).toHaveValue("hello@example.com");
  await field.press("Tab");
  await expect(page.locator("#uncontrolled")).toBeFocused();
  const search = page.locator("#uncontrolled");
  await expect(search).toHaveValue("initial");
  await search.fill("search text");
  await search.evaluate((el) => el.setSelectionRange(0, 6));
  await page.keyboard.type("query");
  await expect(search).toHaveValue("query text");
  expect(await search.evaluate((el) => el.selectionStart)).toBe(5);
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await expect(field).toHaveCSS("filter", "none");
  await expect(field).toHaveCSS("backdrop-filter", "none");
  await expect(page.locator(".liquid-glass-input__surface").first()).toHaveCSS(
    "pointer-events",
    "none",
  );
  await page.locator("#submit").click();
  await expect(page.locator("#submitted")).toHaveText(
    JSON.stringify({
      email: "hello@example.com",
      query: "query text",
      password: "secret",
    }),
  );
  const surface = page.locator(".liquid-glass-input__surface").first();
  const oldSurface = await surface.evaluate((el) =>
    el.style.getPropertyValue("--hyalite"),
  );
  await page
    .getByRole("button", { name: "Toggle radius", exact: true })
    .click();
  await expect.poll(() => ref("a")).not.toBe(a);
  expect(await ref("b")).toBe(b);
  await expect
    .poll(() =>
      surface.evaluate((el) => el.style.getPropertyValue("--hyalite")),
    )
    .not.toBe(oldSurface);
  await expect(field).toHaveCSS("border-top-left-radius", "28px");
  const beforeSize = await ref("a");
  await page.locator("#a").evaluate((el) => (el.style.width = "300px"));
  await expect.poll(() => ref("a")).not.toBe(beforeSize);
  expect(await ref("b")).toBe(b);
  const observers = await page.evaluate(() => window.resources());
  await page
    .getByRole("button", { name: "Swap custom ref", exact: true })
    .click();
  await expect(page.locator("article#custom")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.resources()))
    .toEqual(observers);
  await page
    .getByRole("button", { name: "Toggle effect", exact: true })
    .click();
  await expect(page.locator("#a")).toHaveCSS("backdrop-filter", "none");
  await expect(page.locator("filter")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.resources()))
    .toEqual({ resize: 0, mutation: 0, frames: 0 });
  await page
    .getByRole("button", { name: "Toggle effect", exact: true })
    .click();
  await expect.poll(() => ref("a")).toMatch(/^url/);
  await page
    .getByRole("button", { name: "Animate next mount", exact: true })
    .click();
  expect(await page.locator('filter[id*="-m"]').count()).toBe(0);
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: "Toggle mount", exact: true })
      .click();
    await expect(page.locator("svg")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.resources()))
      .toEqual({ resize: 0, mutation: 0, frames: 0 });
    expect(
      await page.evaluate(() =>
        Object.values(window.probe.refs()).every((r) => r === null),
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Toggle mount", exact: true })
      .click();
    await expect.poll(() => ref("a")).toMatch(/^url/);
  }
  await page.getByRole("button", { name: "Toggle mount", exact: true }).click();
  const core = await page.evaluate(async () => {
    const el = document.createElement("div");
    el.className = "liquid-glass";
    el.style.cssText = "width:280px;height:150px;border-radius:21px";
    el.style.setProperty("--hyalite", "blur(4px)", "important");
    document.body.append(el);
    const instance = window.probe.create(el, { materialize: 1000 });
    let duplicate = false;
    try {
      window.probe.create(el);
    } catch {
      duplicate = true;
    }
    const initial = el.style.getPropertyValue("--hyalite");
    const before = window.resources();
    instance.setOptions({ thickness: 21 });
    instance.setOptions({ thickness: 22 });
    instance.setOptions({ thickness: 22 });
    const noRamp = document.querySelectorAll('filter[id*="-m"]').length === 0;
    const after = window.resources();
    const sameObservers =
      before.resize === after.resize && before.mutation === after.mutation;
    instance.setOptions({ settle: 200 });
    el.style.width = "310px";
    await new Promise((r) => setTimeout(r, 40));
    instance.destroy();
    instance.destroy();
    instance.setOptions({ bevel: 12 });
    instance.refresh();
    await new Promise((r) => setTimeout(r, 250));
    const restored =
      el.style.getPropertyValue("--hyalite") === "blur(4px)" &&
      el.style.getPropertyPriority("--hyalite") === "important";
    el.remove();
    return {
      duplicate,
      ramp: initial.includes("-m"),
      noRamp,
      sameObservers,
      restored,
      resources: window.resources(),
      filters: document.querySelectorAll("filter").length,
    };
  });
  expect(core).toEqual({
    duplicate: true,
    ramp: true,
    noRamp: true,
    sameObservers: true,
    restored: true,
    resources: { resize: 0, mutation: 0, frames: 0 },
    filters: 0,
  });
  await page.evaluate(() => window.probe.force(false));
  await page.getByRole("button", { name: "Toggle mount", exact: true }).click();
  await expect(page.locator("#a")).toHaveCSS("backdrop-filter", "blur(2px)");
  await expect(page.locator("filter")).toHaveCount(0);
  await field.fill("fallback@example.com");
  await expect(field).toHaveValue("fallback@example.com");
  await page.getByRole("button", { name: "Toggle mount", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.resources()))
    .toEqual({ resize: 0, mutation: 0, frames: 0 });
  expect(errors).toEqual([]);
  await context.close();
  return {
    strictMode,
    errors,
    checks: [
      "independent options",
      "shared cache",
      "repeat updates",
      "legacy isolation",
      "native buttons/forms/selection",
      "refs and callback cleanup",
      "class radius and resize",
      "ref replacement",
      "enabled vs disabled",
      "repeated cleanup (SVG/RO/MO/rAF)",
      "interrupted materialize",
      "CSS fallback",
    ],
  };
}
