import { readFileSync, writeFileSync } from "node:fs";
const read = (name) =>
  JSON.parse(readFileSync(`performance-results/${name}.json`, "utf8"));
const before = read("before"),
  after = read("after"),
  quality = read("quality"),
  image = read("image-startup");
if (
  before.rows.length !== 12 ||
  after.rows.length !== 36 ||
  quality.rows.length !== 30 ||
  image.rows.length !== 12 ||
  quality.differences.length !== 4 ||
  quality.differences.some((d) => d.backgroundPixels !== 0)
)
  throw Error("Incomplete three-repeat matrix");
const traceNames = new Set([
  "Paint",
  "PrePaint",
  "RasterTask",
  "Decode Image",
  "PaintArtifactCompositor::Update",
  "SingleThreadProxy::DoComposite",
  "DrawFrame",
  "CompositeLayers",
  "Layerize",
  "LocalFrameView::pushPaintArtifactToCompositor",
]);
const phase = (p) => ({
  ...p,
  trace:
    p.trace &&
    Object.fromEntries(
      Object.entries(p.trace).filter(([name]) => traceNames.has(name)),
    ),
});
const startup = (s) => ({
  wallMs: s.wallMs,
  documents: s.documents.map((d) => ({
    maps: d.maps,
    pngMs: d.png.reduce((a, b) => a + b, 0),
    commits: d.commitHook ? d.commits : null,
    ro: d.ro,
    longTasks: d.longTasks,
  })),
});
const run = (r) => ({
  ...r,
  cold: startup(r.cold),
  warm: startup(r.warm),
  forest: {
    width: r.forest.width,
    height: r.forest.height,
    bytes: r.forest.bytes,
    decodeMs: r.forest.decodeMs,
    resourceMs: r.forest.resource?.duration,
    transferBytes: r.forest.resource?.transferSize,
  },
  phases: r.phases.map(phase),
});
for (const data of [before, after])
  for (const row of data.rows)
    for (const p of row.phases) {
      if (
        ["drag1", "instances5", "instances20"].includes(p.name) &&
        (p.maps !== 0 || p.pointers < 46 || p.commits === null || p.commits < 1)
      )
        throw Error("Invalid real drag sample");
    }
const payload = {
  date: "2026-11-05",
  environment: {
    os: "Windows x64",
    cpu: "AMD Ryzen 7 5800H",
    node: "24.22.1",
    npm: "9.6.7",
    browser: after.browser,
    headless: true,
    viewport: after.viewport,
    physicalDisplay: [1920, 1080],
    refreshHz: 240,
    gpuRenderer: image.backend.renderer,
    baseline: "b257c17f448446729172b39991d85f293303c4ac",
  },
  method: {
    repeats: 3,
    idleMs: 10000,
    dragPointerMoves: 90,
    stressPointerMoves: 45,
    resizeFrames: 30,
    raf: "single rAF monitor in active TS scene; cancelled between phases; probe itself requests frames",
    maps: "one new 2D canvas per buildMap; prototype instrumentation, checked against onBuild",
    commits:
      "React DevTools onCommitFiberRoot, all documents summed; no render count claim",
    traces:
      "first trial per mode/DPR/quality/phase; X event sums across threads, not wall time or GPU use",
    cold: "new context, HTTP cache disabled; Vite/server and browser process may already be warm",
    warm: "same context, next navigation with HTTP cache enabled",
    startupImage: "separate fresh Chrome process for each decode/raster trace",
    quality:
      "production single active variant, 45 real moves; comparison captures use fresh isolated Chrome processes and initial quality options",
  },
  before: { ...before, rows: before.rows.map(run) },
  after: { ...after, rows: after.rows.map(run) },
  quality,
  image: {
    ...image,
    rows: image.rows.map((r) => ({
      ...r,
      imageEvents: r.imageEvents
        .filter((e) =>
          [
            "Decode Image",
            "ImageFrameGenerator::decodeAndScale",
            "GpuImageDecodeCache::UploadImage",
            "ImageDecodeTask",
          ].includes(e.name),
        )
        .map((e) => ({ name: e.name, ms: e.ms, imageType: e.args.imageType })),
    })),
  },
};
writeFileSync(
  "docs/lg-c-measurements.json",
  JSON.stringify(
    payload,
    (_, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v),
    2,
  ) + "\n",
);
const median = (a) => {
  a = a.slice().sort((a, b) => a - b);
  return a[Math.floor(a.length / 2)];
};
const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
for (const mode of ["dev", "production"])
  for (const dpr of [1, 2]) {
    const b = before.rows.filter((r) => r.mode === mode && r.dpr === dpr),
      a = after.rows.filter(
        (r) => r.mode === mode && r.dpr === dpr && r.quality === "Reference",
      );
    const p = (rows, name, key) =>
      median(rows.map((r) => r.phases.find((p) => p.name === name)[key]));
    console.log(
      mode,
      dpr,
      "Reference",
      JSON.stringify({
        cold: [
          median(b.map((r) => r.cold.wallMs)),
          median(a.map((r) => r.cold.wallMs)),
        ],
        warm: [
          median(b.map((r) => r.warm.wallMs)),
          median(a.map((r) => r.warm.wallMs)),
        ],
        drag: [
          "p50",
          "p95",
          "p99",
          "over33",
          "over50",
          "frames",
          "elapsed",
          "commits",
          "ro",
        ].map((key) => [key, p(b, "drag1", key), p(a, "drag1", key)]),
        scriptMs: [
          median(b.map((r) => r.phases[1].mainThread.ScriptDuration)) * 1000,
          median(a.map((r) => r.phases[1].mainThread.ScriptDuration)) * 1000,
        ],
      }),
    );
    for (const quality of ["Reference", "Balanced", "Fast"]) {
      const r = after.rows.filter(
        (r) => r.mode === mode && r.dpr === dpr && r.quality === quality,
      );
      console.log(
        "quality",
        quality,
        JSON.stringify(
          ["drag1", "instances5", "instances20", "resize"].map((name) => ({
            name,
            p50: fmt(p(r, name, "p50")),
            p95: fmt(p(r, name, "p95")),
            p99: fmt(p(r, name, "p99")),
            over33: p(r, name, "over33"),
            over50: p(r, name, "over50"),
            maps: p(r, name, "maps"),
          })),
        ),
      );
    }
  }
for (const dpr of [1, 2])
  for (const name of [
    "Reference",
    "dispersion-only",
    "sat-only",
    "Balanced",
    "Fast",
  ]) {
    const r = quality.rows.filter((r) => r.dpr === dpr && r.name === name);
    console.log(
      "ablation",
      dpr,
      name,
      JSON.stringify({
        graph: r[0].graph,
        p95: fmt(median(r.map((r) => r.p95))),
        scriptMs: fmt(median(r.map((r) => r.scriptMs))),
      }),
    );
  }
console.log("Saved reviewed measurements: docs/lg-c-measurements.json");
