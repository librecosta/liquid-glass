import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { instrument } from "./perf-instrument.mjs";
const arg = (name) => {
  const i = process.argv.indexOf("--" + name);
  return i < 0 ? null : process.argv[i + 1];
};
const label = arg("label") || "after",
  before = label === "before";
const trials = +(arg("trials") || 3),
  idleMs = +(arg("idle-ms") || 10000);
const qualities = before ? ["Reference"] : ["Reference", "Balanced", "Fast"];
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--disable-background-networking"],
});
mkdirSync("performance-results/traces", { recursive: true });
const rows = [];
const pct = (values, p) => {
  const a = values.slice().sort((x, y) => x - y);
  return a.length
    ? a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)]
    : null;
};
const preset = (q) =>
  q === "Fast"
    ? { dispersion: 0, sat: 1 }
    : q === "Balanced"
      ? { dispersion: 0.8, sat: 1 }
      : {};
for (const mode of ["dev", "production"])
  for (const dpr of [1, 2])
    for (const quality of qualities)
      for (let trial = 1; trial <= trials; trial++) {
        const context = await browser.newContext({
          viewport: { width: 1480, height: 960 },
          deviceScaleFactor: dpr,
        });
        await context.addInitScript(instrument);
        const page = await context.newPage(),
          cdp = await context.newCDPSession(page);
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await cdp.send("Performance.enable");
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        const base = before
          ? mode === "dev"
            ? "http://127.0.0.1:5174"
            : "http://127.0.0.1:4174"
          : mode === "dev"
            ? "http://127.0.0.1:5173"
            : "http://127.0.0.1:4173";
        const url = base + (before ? "/" : `/?quality=${quality}`);
        const target = () =>
          before
            ? page.frames().find((f) => f.url().includes("engine=port"))
            : page.mainFrame();
        const wait = async () => {
          if (before)
            await page.waitForFunction(
              () =>
                [...document.querySelectorAll("iframe")].length === 2 &&
                [...document.querySelectorAll("iframe")].every(
                  (f) => f.contentWindow.__ready,
                ),
            );
          else
            await page.waitForFunction(() => window.__ready && window.__engine);
        };
        const load = async () => {
          const start = Date.now();
          await page.goto(url);
          await wait();
          if (pageErrors.length) throw Error(pageErrors.join("\n"));
          const t = target();
          await t.evaluate(async () => {
            const v = getComputedStyle(
              document.getElementById("scene"),
            ).backgroundImage;
            const url = v.match(/url\("?(.*?)"?\)/)?.[1];
            const im = new Image();
            im.src = url;
            await im.decode();
          });
          return {
            wallMs: Date.now() - start,
            documents: await Promise.all(
              page
                .frames()
                .map((f) =>
                  f.evaluate(() => ({ ...window.__perf, frames: undefined })),
                ),
            ),
          };
        };
        const cold = await load();
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
        const warm = await load();
        const t = target();
        if (!before) {
          await t.evaluate((q) => window.__configure({ quality: q }), quality);
          await page.waitForTimeout(120);
        }
        const forest = await t.evaluate(async () => {
          const url = getComputedStyle(
            document.getElementById("scene"),
          ).backgroundImage.match(/url\("?(.*?)"?\)/)[1];
          const resource = performance
            .getEntriesByType("resource")
            .find((r) => r.name === url);
          const bytes = await (await fetch(url)).blob();
          const image = new Image();
          const local = URL.createObjectURL(bytes);
          const start = performance.now();
          image.src = local;
          await image.decode();
          const decodeMs = performance.now() - start;
          URL.revokeObjectURL(local);
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            bytes: bytes.size,
            decodeMs,
            resource: resource?.toJSON(),
          };
        });
        const mapCost = await t.evaluate((q) => {
          const opts =
            q === "Fast"
              ? { dispersion: 0, sat: 1 }
              : q === "Balanced"
                ? { dispersion: 0.8, sat: 1 }
                : {};
          const el = document.createElement("div");
          el.style.cssText =
            "position:absolute;width:317px;height:219px;border-radius:17px";
          document.body.append(el);
          let toBuild = 0;
          const start = performance.now();
          window.__engine.attach(el, {
            ...opts,
            onBuild: () => (toBuild = performance.now() - start),
          });
          const attachMs = performance.now() - start;
          window.__engine.detach(el);
          el.remove();
          return { toBuildCallbackMs: toBuild, attachMs };
        }, quality);
        const frames = page.frames();
        async function phase(name, action, trace = false) {
          for (const f of frames)
            await f.evaluate((track) => window.__startPerf(track), f === t);
          const beforeMetrics = await cdp.send("Performance.getMetrics");
          let events = [];
          const listener = (e) => events.push(...e.value);
          if (trace) {
            cdp.on("Tracing.dataCollected", listener);
            await cdp.send("Tracing.start", {
              categories:
                "devtools.timeline,cc,blink,disabled-by-default-devtools.timeline",
              transferMode: "ReportEvents",
            });
          }
          await action();
          const documents = await Promise.all(
            frames.map((f) => f.evaluate(() => window.__stopPerf())),
          );
          const m = documents[frames.indexOf(t)],
            a = m.frames;
          const afterMetrics = await cdp.send("Performance.getMetrics");
          let traceStats;
          if (trace) {
            const done = new Promise((r) =>
              cdp.once("Tracing.tracingComplete", r),
            );
            await cdp.send("Tracing.end");
            await done;
            cdp.off("Tracing.dataCollected", listener);
            traceStats = {};
            for (const e of events)
              if (e.ph === "X" && e.dur) {
                const x = (traceStats[e.name] ??= { count: 0, ms: 0 });
                x.count++;
                x.ms += e.dur / 1000;
              }
            writeFileSync(
              `performance-results/traces/${label}-${mode}-dpr${dpr}-${quality}-${name}.json`,
              JSON.stringify({ traceEvents: events }),
            );
          }
          return {
            name,
            frames: a.length,
            p50: pct(a, 0.5),
            p95: pct(a, 0.95),
            p99: pct(a, 0.99),
            over33: a.filter((n) => n > 33).length,
            over50: a.filter((n) => n > 50).length,
            elapsed: m.elapsed,
            maps: documents.reduce((s, d) => s + d.maps, 0),
            pngMs: documents.reduce(
              (s, d) => s + d.png.reduce((a, b) => a + b, 0),
              0,
            ),
            commits: documents.every((d) => d.commitHook)
              ? documents.reduce((s, d) => s + d.commits, 0)
              : null,
            ro: documents.reduce((s, d) => s + d.ro, 0),
            pointers: m.pointers,
            messages: documents.reduce((s, d) => s + d.messages, 0),
            styleReads: documents.reduce((s, d) => s + d.styleReads, 0),
            longTasks: documents.flatMap((d) => d.longTasks),
            mainThread: Object.fromEntries(
              afterMetrics.metrics
                .filter((x) =>
                  [
                    "TaskDuration",
                    "ScriptDuration",
                    "LayoutDuration",
                    "RecalcStyleDuration",
                    "LayoutCount",
                    "RecalcStyleCount",
                  ].includes(x.name),
                )
                .map((x) => [
                  x.name,
                  x.value -
                    (beforeMetrics.metrics.find((y) => y.name === x.name)
                      ?.value ?? 0),
                ]),
            ),
            trace: traceStats,
          };
        }
        async function drag(events = 90) {
          const box = await t
            .getByRole("button", { name: "移动卡片" })
            .boundingBox();
          await page.mouse.move(box.x + 10, box.y + 10);
          await page.mouse.down();
          await t.evaluate(() => {
            if (!document.querySelector(".drag-handle").hasPointerCapture(1))
              throw Error("Stress card occluded the drag handle");
          });
          for (let i = 0; i < events; i++) {
            await page.mouse.move(
              box.x + 10 + Math.round(65 * Math.sin(i / 13)),
              box.y + 10 + Math.round(30 * Math.sin(i / 19)),
            );
            await page.waitForTimeout(8);
          }
          await page.mouse.up();
        }
        const phases = [];
        phases.push(
          await phase(
            "static10s",
            () => page.waitForTimeout(idleMs),
            trial === 1,
          ),
        );
        phases.push(await phase("drag1", () => drag(), trial === 1));
        phases.push(
          await phase(
            "resize",
            async () => {
              await t.evaluate(async () => {
                const el = document.getElementById("card");
                for (let i = 0; i < 30; i++) {
                  el.style.width = `${314 + i * 3}px`;
                  await new Promise((r) => requestAnimationFrame(r));
                }
              });
              await page.waitForTimeout(250);
            },
            trial === 1,
          ),
        );
        await t.evaluate(
          () => (document.getElementById("card").style.width = "300px"),
        );
        await page.waitForTimeout(200);
        for (const count of [5, 20]) {
          if (before)
            await t.evaluate(
              ({ count, opts }) => {
                document.querySelectorAll(".perf-clone").forEach((el) => {
                  window.__engine.detach(el);
                  el.remove();
                });
                const source = document.getElementById("card"),
                  x = source.offsetLeft,
                  y = source.offsetTop;
                for (let i = 1; i < count; i++) {
                  const el = source.cloneNode(true);
                  el.removeAttribute("id");
                  el.querySelector(".drag-handle")?.remove();
                  el.classList.add("perf-clone");
                  el.style.zIndex = "0";
                  el.style.left = `${(x + i * 13) % 200}px`;
                  el.style.top = `${(y + i * 17) % 260}px`;
                  document.getElementById("scene").append(el);
                  window.__engine.attach(el, opts);
                }
              },
              { count, opts: preset(quality) },
            );
          else
            await t.evaluate(
              (n) => window.__configure({ instances: n }),
              count,
            );
          // Keep the interactive handle above overlapping stress cards in both versions.
          await t.evaluate(() => {
            (
              document.getElementById("position") ||
              document.getElementById("card")
            ).style.zIndex = "100";
          });
          await page.waitForTimeout(200);
          phases.push(
            await phase("instances" + count, () => drag(45), trial === 1),
          );
        }
        const row = {
          mode,
          dpr,
          quality,
          trial,
          cold,
          warm,
          forest,
          mapCost,
          phases,
        };
        rows.push(row);
        writeFileSync(
          `performance-results/${label}.json`,
          JSON.stringify(
            {
              browser: browser.version(),
              label,
              trials,
              idleMs,
              viewport: [1480, 960],
              rows,
            },
            null,
            2,
          ),
        );
        const dragPhase = phases.find((p) => p.name === "drag1");
        console.log(
          JSON.stringify({
            label,
            mode,
            dpr,
            quality,
            trial,
            drag: {
              p50: dragPhase.p50,
              p95: dragPhase.p95,
              commits: dragPhase.commits,
              maps: dragPhase.maps,
            },
            mapCost,
          }),
        );
        await context.close();
      }
await browser.close();
