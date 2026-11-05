# LG-C2 — Headless API & Optical Finish

Issue [#4](https://github.com/librecosta/liquid-glass/issues/4), based on `dev` at `d3cbe91`. Reference core/defaults and frozen LG-A fixtures are unchanged. No npm/Release/main merge. User review decides any later default change and closure of #3/#4.

## API and native DOM

One private ESM package: core exports `createLiquidGlass`, `DEFAULTS`, `QUALITY_PRESETS`, `supported` and `LiquidGlass*` types; `/react` exports only `useLiquidGlass` and types. Prefab components and public legacy global facade/attach/watch/setOpts exports were removed. The legacy engine remains internal, with its full MIT notice. No optical algorithm was rewritten.

Optional CSS now contains only low-specificity effect rules. Apps own radius, layout, borders and native semantics. The Playground and [Hook DIY example](../src/components-demo.tsx) use real div/button/input elements. Inputs have a separate decorative, pointer-events-none glass span below transparent native text/caret. Native form/type/keyboard/focus/disabled behavior, Hook enabled/ref/options/refresh/StrictMode and core independence/cache/resize/cleanup remain covered by the external tarball consumer.

## Edge sources and visual comparison

Three independent sources were separated:

- CSS `edge`: the engine's multi-layer inset white shadows. `edge=0` writes `none`, without disabling optical filters. Core Reference stays **0.32**; the initial Playground explicitly overrides only **edge=0**.
- Ordinary demo borders: removed the persistent silver button/input border. App-owned hover/disabled states and blue `:focus-visible` outline remain, including when glass is disabled.
- SVG `rim`: optical reflection inside the lens, retained at **1.76** in every comparison. The lighter outline still has a visible rim; inspection did not justify changing it.

All images: Chrome 156, DPR1, identical 500×480 scene, card 300×220 at (100,142), local forest or precise grid. Captured in fresh browser processes to avoid JPEG resampling differences. Reference has **0 changed pixels** against both frozen scene goldens; all 16 captures have **0 changed background pixels** outside the lens bounds. Other changed pixels are expected candidate differences, not accepted new goldens.

| Configuration | Forest | Grid |
| --- | --- | --- |
| Reference, edge=0.32 | [image](c2/reference-forest.png) | [image](c2/reference-grid.png) |
| Reference + edge=0 | [image](c2/edge-0-forest.png) | [image](c2/edge-0-grid.png) |
| Reference + edge=0.08 | [image](c2/edge-008-forest.png) | [image](c2/edge-008-grid.png) |
| Reference + edge=0.16 | [image](c2/edge-016-forest.png) | [image](c2/edge-016-grid.png) |
| Reference + sat=1 | [image](c2/sat-1-forest.png) | [image](c2/sat-1-grid.png) |
| Optical Balanced | [image](c2/optical-forest.png) | [image](c2/optical-grid.png) |
| Balanced | [image](c2/balanced-forest.png) | [image](c2/balanced-grid.png) |
| Fast | [image](c2/fast-forest.png) | [image](c2/fast-grid.png) |

The forest shows the white contour most clearly; the grid exposes retained displacement and chromatic edges. edge=0/0.08/0.16 progressively weaken the CSS line compared with 0.32. Optical Balanced retains dispersion=1.6 and rim=1.76, changes sat=0.86→1 and edge=0.32→0, with all other Reference parameters inherited. It removes edge desaturation, so color can be stronger. Balanced reduces dispersion to 0.8; Fast removes chromatic separation. All are explicit lossy experiments.

## Actual drag results

2026-11-05, production build, headless Chrome **156.0.8078.80**, AMD Radeon Graphics via ANGLE/D3D11 (driver 31.0.21921.1000). Viewport 1480×960, scene 500×480. Six configurations × DPR1/2 × 1/5 cards × **three repeats = 72 runs**, sequentially with one active configuration. Each run sends 45 real pointer moves at a requested 8ms spacing, verifies pointer capture, and records actual update intervals. The first repeat also collects a CDP trace. [All runs and capture checks](lg-c2-measurements.json); [measurement script](../scripts/measure-finish.mjs).

Times below are milliseconds, **median of each run's p50/p95 across three repeats**. Long frames are summed rAF intervals >33/>50ms across the three runs. All single-card runs have zero such intervals. Five-card DOM p95 independently measures style-update spacing; it is not painted-frame time.

| DPR | Configuration | 1 card rAF p50 / p95 | 5 cards rAF p50 / p95 | 5 cards >33 / >50 | 5 cards DOM p95 |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Reference | 4.2 / 20.8 | 79.2 / 95.8 | 126 / 126 | 102.3 |
| 1 | Reference + edge=0 | 8.3 / 16.7 | 79.2 / 104.1 | 126 / 126 | 105.4 |
| 1 | Reference + sat=1 | 4.2 / 4.3 | 29.1 / 33.4 | 43 / 2 | 35.0 |
| 1 | Optical Balanced | 4.2 / 4.3 | 29.1 / 33.4 | 25 / 0 | 33.4 |
| 1 | Balanced | 4.2 / 4.3 | 29.1 / 33.4 | 20 / 0 | 33.7 |
| 1 | Fast | 4.2 / 4.3 | 12.4 / 16.7 | 0 / 0 | 29.0 |
| 2 | Reference | 12.5 / 16.7 | 75.0 / 83.3 | 126 / 126 | 85.2 |
| 2 | Reference + edge=0 | 8.4 / 16.7 | 71.0 / 83.4 | 126 / 126 | 85.8 |
| 2 | Reference + sat=1 | 4.2 / 4.3 | 29.1 / 33.2 | 12 / 0 | 33.7 |
| 2 | Optical Balanced | 4.2 / 4.3 | 29.1 / 33.3 | 14 / 0 | 33.3 |
| 2 | Balanced | 4.2 / 4.2 | 29.1 / 33.4 | 17 / 0 | 33.5 |
| 2 | Fast | 4.2 / 4.3 | 12.4 / 16.7 | 0 / 0 | 24.9 |

Removing only edge gives **no stable five-card performance gain**. sat=1 reduces the SVG graph from 28 primitives to 18 while retaining all three displacement channels; Optical Balanced and Balanced have the same counts and similar timing. Fast has 11 primitives / one displacement. No SDF, map resolution, encoding, cache or shader changes were needed.

The five-card Optical candidate also improves independent observations: DPR1/2 DOM p95 102.3/85.2→33.4/33.3ms; CDP mouse dispatch p95 83.0/71.6→21.9/20.0ms; 45-move run elapsed medians 3711/3386→1325/1313ms. Every run had zero map/PNG rebuilds, zero ResizeObserver deliveries and one final React position commit. Trace summaries expose compositor-update events but do not measure GPU utilization or prove GPU stage duration.

**Do not read 4.3ms rAF as 233 painted FPS.** Idle callbacks are included, the display cadence is about 4.17ms on this host, and actual single-card DOM updates are around 16.6ms. Input scheduling and trace overhead affect results; runs have fixed event counts but different elapsed durations, so long-frame counts are not equal-duration rates. DPR2 being sometimes faster is host/run variation, not evidence of a DPR optimization. Five-card Optical still has roughly 33ms p95; none of these measurements guarantees performance on another device or visible browser.

**Recommendation:** keep Reference as the library default/regression baseline; use explicit edge=0 for the lighter example contour. Offer Optical Balanced as an opt-in candidate for manual review: it retains Reference dispersion with performance comparable to Balanced on this host. sat=1 is responsible for most of the measured gain and changes color; no lossless claim or automatic default promotion. Fast remains the explicit lower-fidelity choice.

## Manual Playground and reproduction

Run `npm ci` then `npm run dev`. At the usual local port:

- [Reference](http://127.0.0.1:5173/?experiment=reference), [edge=0](http://127.0.0.1:5173/?experiment=edge-0), [sat=1](http://127.0.0.1:5173/?experiment=sat-1), [Optical Balanced](http://127.0.0.1:5173/?experiment=optical), [Balanced](http://127.0.0.1:5173/?experiment=balanced), [Fast](http://127.0.0.1:5173/?experiment=fast).
- In one tab, use “逐项比较” and the four CSS edge buttons to preserve card geometry/position. Compare forest then grid, single card then five, and drag by the handle. Reference or Reset restores the historical defaults; `/` alone starts with the labeled example edge=0 override.
- [Hook DIY](http://127.0.0.1:5173/components.html): independent cards and native button/email form, enabled versus disabled, keyboard focus/Space, submit and external refresh. It explicitly starts with the Optical candidate. Source links in README show how to own the DOM/styles.

`npm run check` verifies 3 Node tests, 8 browser tests (six frozen Reference scenes plus new finish/native-DOM checks), build and an independent React 19 + strict TS tarball app in dev StrictMode/production. It also checks exact runtime export keys, rejected old/type-invalid APIs, SSR without browser globals, native forms/refs/selection, shared cache, resizing, cleanup, fallback and complete MIT inclusion. No duplicate React, demo/photo dependency, aliases or workspace symlinks enter the consumer.

To repeat measurements, run `npm run build`, then `npm run preview -- --port 4183 --strictPort`; in another terminal run `node scripts/measure-finish.mjs`. `LG_FINISH_URL` overrides the URL; `LG_CHROME` selects Chrome. This overwrites the measurement JSON/images; inspect changes before committing. Raw first-repeat traces and intermediate runs stay in ignored `performance-results/c2/`.

Remaining: user aesthetic approval/default decision; real Safari/Firefox, password managers and assistive technology; CSP denial is not automatically detected (maps require `img-src data:`). Existing folded-field/radius/overlapping-filter limits remain. The forest is demo-only, owner-reported CC0 with original provenance unverified as already documented in notices. No release or issue closure is implied by these checks.
