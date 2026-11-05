# LG-C3 — Balanced default & Fast switching

Issue [#5](https://github.com/librecosta/liquid-glass/issues/5), based on `56fc13c`. The approved core defaults are now Balanced: **dispersion=0.8, sat=1, edge=0, rim=0.80**. Fast explicitly changes dispersion to 0 and repeats the other three values. Other defaults and all rendering algorithms remain unchanged. Core without options, Hook without config, Playground first paint/Reset and Hook DIY agree.

Reference is historical regression only. Its named, frozen `REFERENCE_DEFAULTS` object in `src/quality.ts` pins every original parameter independently of the new defaults. `QUALITY_PRESETS.Reference` exposes that complete configuration; the old math/map/SVG/pixel gold files are untouched. Optical Balanced is labeled an LG-C2 experimental comparison with its original dispersion=1.6/sat=1/edge=0/rim=1.76, never another default.

Core quality changes use ordinary `setOptions` patches. Balanced/Fast explicitly replace all four quality fields; caller overrides of other fields remain local. Reference intentionally restores its complete historical parameter set. Single-field patches retain their meaning. React options remain complete values; omitting them again restores Balanced. Switching retains the bound DOM and ownership, does not replay materialize, and reuses warm maps. A new rim needs a map once because rim is encoded in the map; edge-only changes need no map/filter rebuild. No preset engine, new components or extra public exports were introduced.

## Validation and images

`npm run check`: 3 Node tests, build/TypeScript, 9 browser tests and an independent installed React 19 + strict TypeScript tarball consumer in development StrictMode and production. It verifies unconfigured core/Hook against independent explicit values, repeated Reference/Fast/Balanced/default switching by actual map/SVG/CSS fingerprints, stable DOM, instance isolation, warm cache, rim/edge patches, no animation replay, native forms/keyboard/input selection, ref replacement, resize, SSR, fallback, zero leaked observers/frames/SVG, exact Headless exports, MIT and no duplicate React/demo photo dependency.

Original Reference: all six scenes still **0 pixel differences** and original map/SVG digests match. New, separately reviewed C3 fixtures also pass at zero tolerance, both before and after Reference→current switching:

| New fixture | Forest | Grid |
| --- | --- | --- |
| Balanced | [image](../tests/golden/c3/balanced-forest.png) | [image](../tests/golden/c3/balanced-grid.png) |
| Fast | [image](../tests/golden/c3/fast-forest.png) | [image](../tests/golden/c3/fast-grid.png) |

Both show no CSS outline and lower optical highlight; Fast loses chromatic separation. These are the newly approved appearance, not a replacement for old Reference goldens. Browser/image capture details are in the [C3 fixture note](../tests/golden/c3/README.md).

## Performance sample

2026-11-05, production, Chrome 156.0.8078.80 headless / AMD Radeon ANGLE D3D11. Viewport 1480×960, scene 500×480, **five cards**, 45 genuine captured pointer moves with requested 8ms waits. Warm Reference→Fast→Balanced transitions precede every run. One active page/configuration, DPR1/2, three repeats. This is a smoke sample, not the previous 72-run matrix or a throughput guarantee.

An initial [12-run sample](lg-c3-measurements.json) gave Balanced rAF p95 41.8/50.1ms and Fast 25.1/29.2ms (DPR1/2), higher than the old report. To distinguish host/batch variation, the untouched `56fc13c` checkout and C3 were then built and sampled in **24 alternating before/after runs**, reversing order on alternate trials. The old Balanced/Fast used edge=0.32/rim=1.76; C3 uses edge=0/rim=0.80. [All paired runs](lg-c3-paired-measurements.json).

Each cell below is the median of three per-run statistics, **old→C3**. Long intervals are sums across those three runs, with fixed pointer counts but differing durations.

| DPR / quality | rAF p50 ms | rAF p95 ms | DOM update p95 ms | rAF >33 / >50ms |
| --- | ---: | ---: | ---: | ---: |
| 1 / Balanced | 33.3→33.3 | 41.6→37.6 | 40.3→42.4 | 100/0→107/1 |
| 1 / Fast | 4.3→8.3 | 20.9→20.9 | 29.1→29.0 | 0/0→1/0 |
| 2 / Balanced | 33.2→33.3 | 37.5→37.5 | 46.5→38.9 | 93/2→104/0 |
| 2 / Fast | 9.6→4.3 | 21.0→20.9 | 29.2→29.1 | 1/0→0/0 |

No consistent performance regression was observed in the paired sample; it is too small to claim a general speedup. Both old and current runs vary from the earlier C2 report, so cross-batch numbers are not an optical optimization result. Balanced still has 18 SVG primitives / three displacement channels; Fast has 11 / one. Every one of the 36 runs retained the card DOM, had zero map/PNG rebuilds/ResizeObserver deliveries during drag, no materialize clones and one final React position commit. **rAF includes idle callbacks and is not painted FPS or GPU utilization**; DOM-update spacing is separately recorded. Five-card Balanced remains around 38ms p95 on this host; Fast is the explicit performance choice.

Reproduce current sampling: `npm run build`, `npm run preview -- --port 4185 --strictPort`, then `node scripts/measure-switching.mjs`. `LG_SWITCH_URL` overrides the current URL; `LG_CHROME` selects Chrome. For the paired run, serve an isolated `56fc13c` production checkout at 4186 and set `LG_SWITCH_BEFORE_URL=http://127.0.0.1:4186` before running the same script. The two JSON outputs preserve the first sample separately. Historical LG-C/C2 measurement scripts reject current defaults to avoid overwriting their reports with different configurations.

## Manual Playground

Run `npm ci`, `npm run dev`, then open [Balanced/default](http://127.0.0.1:5173/), [Fast](http://127.0.0.1:5173/?quality=Fast), [Reference — historical](http://127.0.0.1:5173/?quality=Reference) or [Hook DIY](http://127.0.0.1:5173/components.html). Toggle modes in one page to keep position/size, compare forest/grid, change individual parameters and Reset. Controls display effective values. Native inputs retain a separate transparent interaction layer above their glass background.

Headless-first remains one private package with core, one React Hook and optional minimal CSS. No main merge, npm publication or Release. Existing limitations remain: Chromium SVG support, actual Safari/Firefox/assistive technology unverified, explicit data-image CSP permission required without automatic denial detection, folded-field/radius/overlap limits. No additional optical tuning is part of C3.
