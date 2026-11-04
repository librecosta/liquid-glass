import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    launchOptions: {
      ...(process.env.LG_CHROME
        ? { executablePath: process.env.LG_CHROME }
        : { channel: "chrome" }),
      args: ["--disable-background-networking"],
    },
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
