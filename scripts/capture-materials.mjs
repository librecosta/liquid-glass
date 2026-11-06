// Real browser captures, not a parallel renderer. Run with the local Playground up.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const baseURL = process.env.LG_BASE_URL ?? "http://127.0.0.1:5173";
const r2 = process.argv.includes("--r2");
const output = r2 ? "docs/m1/r2" : "docs/m1";
const localOutput = r2 ? "performance-results/m1-r2" : "performance-results/m1";
mkdirSync(output, { recursive: true });
mkdirSync(localOutput, { recursive: true });
const browser = await chromium.launch(process.env.LG_CHROME
  ? { executablePath: process.env.LG_CHROME }
  : process.env.LG_BROWSER === "chromium" ? {} : { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const report = { browser: browser.version(), viewport: { width: 1440, height: 1000 }, dpr: 1, quality: r2 ? "See each capture" : "Balanced", glass: { width: 400, height: 280, radius: "42px" }, backgrounds: r2 ? ["forest", "light", "dark", "grid"] : ["light", "dark", "grid"], captures: [], baselinePixels: {} };
async function backdrop(value) {
  await page.getByRole("combobox", { name: "Background", exact: true }).selectOption(value);
  await page.waitForTimeout(200);
}
async function capture(name, quality = "Balanced", trial = false) {
  const scene = await page.locator("#scene").boundingBox();
  const card = await page.locator("#card").boundingBox();
  const image = await page.screenshot({ clip: { x: Math.round(card.x - 100), y: Math.round(card.y - 70), width: 600, height: 420 } });
  const state = await page.evaluate(() => ({ quality: window.__scene.quality, opts: window.__scene.opts, width: window.__scene.width, height: window.__scene.height, x: window.__scene.x, y: window.__scene.y }));
  assert.equal(state.quality, quality);
  assert.deepEqual(state.opts, {});
  assert.equal(state.width, 400);
  assert.equal(state.height, 280);
  assert.equal(state.x, 305);
  assert.equal(state.y, 169);
  assert.equal(scene.width, 1010);
  assert.equal(scene.height, 618);
  const effectiveOptics = Object.fromEntries(await Promise.all(
    [["bevel", "Bevel"], ["dispersion", "Dispersion"], ["rim", "Optical highlight"], ["edge", "CSS outline"]].map(async ([key, label]) =>
      [key, Number(await page.locator(`input[aria-label="${label} (value)"]`).inputValue())]),
  ));
  if (r2) assert.deepEqual(effectiveOptics, trial
    ? { bevel: 42, dispersion: 1.4, rim: 1.2, edge: 0 }
    : { bevel: 37, dispersion: quality === "Fast" ? 0 : 0.8, rim: 0.8, edge: 0 });
  const skin = await page.locator(".public-scene").evaluate((el) => ({
    material: el.getAttribute("data-material"),
    softVariant: el.getAttribute("data-soft-variant"),
    tint: getComputedStyle(el.querySelector("#card")).backgroundColor,
    displacementChannels: document.querySelectorAll("filter feDisplacementMap").length,
  }));
  if (r2) assert.equal(skin.displacementChannels, quality === "Fast" ? 1 : 3);
  report.captures.push({ name, scene, state, effectiveOptics, opticalTrial: trial, ...skin });
  writeFileSync(`${localOutput}/${name}.png`, image);
  return image;
}
async function sheet(name, title, labels, images, localOnly = false) {
  const sheet = await browser.newPage({ viewport: { width: images.length * 616 + 16, height: 508 }, deviceScaleFactor: 1 });
  await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#0e1418;color:#edf2f3;font:14px 'Segoe UI',sans-serif}h1{margin:0 0 12px;font-size:16px;font-weight:500}.row{display:flex;gap:16px}figure{margin:0;width:600px}figcaption{height:28px;color:#b5c4cc}img{display:block;width:600px;height:420px}</style><h1>${title}</h1><div class="row">${images.map((image, i) => `<figure><figcaption>${labels[i]}</figcaption><img src="data:image/png;base64,${image.toString("base64")}"></figure>`).join("")}</div>`);
  await sheet.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
  await sheet.screenshot({ path: `${localOnly ? localOutput : output}/${name}.jpg`, type: "jpeg", quality: 90 });
  await sheet.close();
}
try {
  await page.goto(`${baseURL}/?lang=en&quality=Balanced&material=clear`);
  await page.waitForFunction(() => window.__ready);
  if (process.argv.includes("--compare-baseline")) {
    for (const background of ["grid", "forest"]) {
      await backdrop(background);
      const actual = PNG.sync.read(await page.locator("#scene").screenshot());
      const expected = PNG.sync.read(readFileSync(`performance-results/m1-baseline/${background}.png`));
      assert.equal(actual.width, expected.width);
      assert.equal(actual.height, expected.height);
      const pixels = pixelmatch(expected.data, actual.data, null, actual.width, actual.height, { threshold: 0, includeAA: true });
      report.baselinePixels[background] = pixels;
      assert.equal(pixels, 0, `Public Clear/${background} preserves v0.1.0 pixels`);
    }
  }
  if (r2) {
    await page.goto(`${baseURL}/?lang=en&quality=Fast&material=soft`);
    await page.waitForFunction(() => window.__ready);
    for (const background of ["forest", "light", "dark"]) {
      await backdrop(background);
      const images = [];
      for (const variant of ["Current · A", "Clearer · B"]) {
        await page.getByRole("group", { name: "Soft A/B", exact: true }).getByRole("button", { name: variant, exact: true }).click();
        images.push(await capture(`soft-${background}-${variant.startsWith("Current") ? "current" : "clearer"}`, "Fast"));
      }
      await sheet(`soft-${background}`, `Soft A/B / ${background} / Fast / same optics, geometry and content / DPR 1`, ["A · Current tint 12% (daylight 10%)", "B · Clearer tint 7% (daylight 6%)"], images, background === "forest");
    }
    await page.getByRole("button", { name: "Prismatic", exact: true }).click();
    await page.locator("summary").filter({ hasText: "Advanced optics" }).click();
    const trial = page.getByRole("checkbox", { name: "Try recommended optics (experiment)", exact: true });
    for (const background of ["grid", "light"]) {
      await backdrop(background);
      const images = [];
      for (const [name, quality, enabled] of [["fast", "Fast", false], ["balanced", "Balanced", false], ["trial", "Balanced", true]]) {
        await page.getByRole("group", { name: "Quality", exact: true }).getByRole("button", { name: new RegExp(`^${quality}`) }).click();
        if (enabled) await trial.check();
        await page.locator("#scene").scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        images.push(await capture(`prismatic-${background}-${name}`, quality, enabled));
      }
      await sheet(`prismatic-${background}`, `Prismatic / ${background} / identical Material CSS / Quality and explicit optical overrides vary`, ["Fast · dispersion 0 / bevel 37 / rim 0.8", "Balanced · dispersion 0.8 / bevel 37 / rim 0.8", "Balanced + explicit trial · dispersion 1.4 / bevel 42 / rim 1.2"], images);
    }
  } else {
  for (const background of report.backgrounds) {
    await backdrop(background);
    const images = [];
    for (const material of ["Clear", "Soft", "Prismatic"]) {
      await page.getByRole("group", { name: "Material", exact: true }).getByRole("button", { name: material, exact: true }).click();
      images.push(await capture(`${background}-${material.toLowerCase()}`));
    }
    await sheet(background, `${background} / Balanced / CSS-only material comparison / 400 × 280 glass / DPR 1`, ["Clear · v0.1.0 baseline", "Soft · candidate", "Prismatic · candidate"], images);
  }
  await backdrop("grid");
  const cssOnly = await capture("prismatic-css-only");
  await page.locator("summary").filter({ hasText: "Advanced optics" }).click();
  await page.getByRole("checkbox", { name: "Try recommended optics (experiment)", exact: true }).check();
  // Inspector interaction may scroll the page; capture the exact same stage.
  await page.locator("#scene").scrollIntoViewIfNeeded();
  const enhanced = await capture("prismatic-optical-trial", "Balanced", true);
  await sheet("optical-trial", "Separate optical experiment / same Prismatic CSS skin, grid, geometry and selected Balanced quality", ["CSS only · actual Balanced optics", "Explicit trial · bevel 42 / dispersion 1.4 / rim 1.2 / edge 0"], [cssOnly, enhanced]);
  }
  writeFileSync(`${localOutput}/captures.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ browser: report.browser, baselinePixels: report.baselinePixels, output, localOutput, captures: report.captures.length }));
} finally {
  await browser.close();
}
