import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
let browserVersion;
let backend;
const rows = [];
mkdirSync("performance-results/traces", { recursive: true });
for (const mode of ["dev", "production"])
  for (const dpr of [1, 2])
    for (let trial = 1; trial <= 3; trial++) {
      const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-background-networking"],
      });
      browserVersion = browser.version();
      if (!backend) {
        const session = await browser.newBrowserCDPSession();
        const { gpu } = await session.send("SystemInfo.getInfo");
        backend = {
          devices: gpu.devices.map((d) => ({
            vendor: d.vendorString,
            device: d.deviceString,
            driver: d.driverVersion,
          })),
          features: gpu.featureStatus,
          renderer: gpu.auxAttributes?.glRenderer,
        };
        await session.detach();
      }
      const context = await browser.newContext({
          viewport: { width: 1480, height: 960 },
          deviceScaleFactor: dpr,
        }),
        page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      const events = [];
      cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
      await cdp.send("Tracing.start", {
        categories:
          "devtools.timeline,cc,blink,disabled-by-default-devtools.timeline",
        transferMode: "ReportEvents",
      });
      await page.goto(
        mode === "dev" ? "http://127.0.0.1:5173/" : "http://127.0.0.1:4173/",
      );
      await page.waitForFunction(() => window.__ready && window.__engine);
      await page.waitForTimeout(350);
      const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
      await cdp.send("Tracing.end");
      await done;
      const image = events.filter(
        (e) =>
          [
            "Decode Image",
            "ImageFrameGenerator::decodeAndScale",
            "GpuImageDecodeCache::UploadImage",
            "ImageDecodeTask",
          ].includes(e.name) && e.ph === "X",
      );
      const raster = events.filter(
        (e) => e.name === "RasterTask" && e.ph === "X",
      );
      const mapProbe = await page.evaluate(() => {
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;width:317px;height:219px;border-radius:17px";
        document.body.append(el);
        let pngMs = 0,
          buildMs = 0;
        const encode = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (...args) {
          const start = performance.now();
          const value = encode.apply(this, args);
          pngMs += performance.now() - start;
          return value;
        };
        const start = performance.now();
        window.__engine.attach(el, {
          onBuild: () => (buildMs = performance.now() - start),
        });
        const attachMs = performance.now() - start;
        const mapSize = window.__engine.info().mapSize;
        HTMLCanvasElement.prototype.toDataURL = encode;
        window.__engine.detach(el);
        el.remove();
        return { buildMs, pngMs, attachMs, mapSize };
      });
      rows.push({
        mode,
        dpr,
        trial,
        mapProbe,
        imageEvents: image.map((e) => ({
          name: e.name,
          ms: (e.dur || 0) / 1000,
          args: e.args,
        })),
        raster: {
          count: raster.length,
          ms: raster.reduce((a, e) => a + (e.dur || 0) / 1000, 0),
        },
      });
      if (trial === 1)
        writeFileSync(
          `performance-results/traces/startup-${mode}-dpr${dpr}.json`,
          JSON.stringify({ traceEvents: events }),
        );
      await context.close();
      await browser.close();
    }
writeFileSync(
  "performance-results/image-startup.json",
  JSON.stringify({ browser: browserVersion, backend, rows }, null, 2),
);
console.log("Saved 12 startup decode/raster traces");
