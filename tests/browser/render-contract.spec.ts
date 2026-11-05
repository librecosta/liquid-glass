import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readRenderState, renderDigest } from "../render-contract.mjs";

const gold = JSON.parse(
  readFileSync("tests/golden/render-contracts.json", "utf8"),
);
test("portable exact map pixels and SVG contracts preserve Reference/Balanced/Fast", async ({
  page,
}) => {
  await page.goto("/?fixture=1&quality=Reference");
  await page.waitForFunction(() => window.__ready && window.__engine);
  for (const { name, patch, digest } of gold.results) {
    await page.evaluate((p) => window.__configure(p), patch);
    await page.waitForTimeout(180);
    expect(renderDigest(await readRenderState(page)), name).toBe(digest);
  }
});
