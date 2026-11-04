# LG-A baseline

## Frozen source and boundaries

Source: [Hyalite v0.5.0](https://github.com/VII-Cae/hyalite--liquid-glass/tree/3c7eb86d7457b437013c5e9579e9c2d6fe713f2d), commit `3c7eb86d7457b437013c5e9579e9c2d6fe713f2d`. `reference/hyalite-v0.5.0/UPSTREAM.json` records SHA-256 for every copied file. Source, declarations, demos, cases, runner, screenshots and licenses are byte-identical; older demo engines remain solely because the untouched original playground loads them. `.gitattributes` prevents checkout line endings from breaking the frozen hashes.

`src/core/index.ts` follows the original functions: SDF → Snell profile → PNG encoding → SVG graph → map/filter caches → DOM lifecycle. All defaults and clamps are retained, including bevel 37, thickness 59, slope 2.7, shade 0.46, rim 1.76, blur 1, dispersion 1.6 and light −140. No React imports, browser reads during module initialization, new renderer, optical retuning or algorithm optimization. The global management semantics remain; named ESM exports are also available. Pure math exports support differential tests, not a packaged public library.

Integration changes are limited to types, ESM exports, a `liquid-glass-` filter ID prefix, and cancellation/removal of private materialize clones on reapply/detach. The original can retain an interrupted clone until its next rAF; the port cleans it immediately, including repeated StrictMode mount/unmount and same-key refresh. Uninterrupted ramp equations and final rendering are unchanged. The hidden SVG host and bounded idle map cache remain module-scoped, as upstream.

The React fixture attaches/detaches in layout effects and refreshes after radius changes; size changes remain under the engine's original ResizeObserver/live/settle rules. Two same-origin iframes isolate the engines without adding instance APIs. Both use a fixed 500×480 scene and the same serialized geometry, background and options. The striped/color-circle background recipe comes from the original demo. Local images use object URLs and stay in the browser. Native button/input samples are feasibility probes, not reusable components.

## Verification, 2026-11-04

Windows x64, AMD Ryzen 7 5800H, Node 24.22.1, npm 9.6.7, headless Google Chrome **156.0.8078.76**, DPR **1**. Both visual pages have viewport **500×516**, including a 36px status strip excluded from comparison. All comparisons use the same installed Chromium, backgrounds and options. No engine detection is forced for normal refraction tests.

`npm run check` passed:

- 4 Node tests: frozen-file integrity, SSR import with throwing getters for browser globals, API/default parity, differential SDF/Fresnel/Snell calculations for all three bevel shapes.
- TypeScript strict checking and Vite production build.
- 9 browser tests: original and adapted TS upstream suites (**32 checks each**), exact visual comparison, fixed-clock materialize comparison, lifecycle/watch/cancellation, playground/native interaction, initial measurements, cache eviction/ownership, reduced motion/unsupported environment.

The independent, unchanged upstream runner also passed 32 checks using a `file:///` cases URL, without Vite. The built production playground was opened at 1480×960: both engines reported 0.5.0, supported refraction and live SVG references; no page exceptions or failed requests were observed. Screenshot reviewed: [production comparison](lg-a-playground.png).

### Visual results

For each scene, compare `info()` including the full PNG URLs/profile arrays, normalize only generated filter IDs in the SVG graph, and compare all **240,000 scene pixels** with pixelmatch `threshold: 0, includeAA: true`. Text, native controls and backgrounds remain in the screenshots; no optical region is masked.

| Scenarios | Result |
| --- | --- |
| Defaults; asymmetric corners; circle; capsule; CSS overlap; elliptical radius | 0 differing pixels each; identical maps and SVG graphs |
| Nonfolding/two-pass; no smoothing or dispersion; lip; thick/dispersive lens | 0 differing pixels each; identical maps and SVG graphs |
| Local image; native controls; self; forced CSS fallback | 0 differing pixels each; identical maps and SVG graphs |
| Materialize at 0, 100, 200, 400ms of a 400ms ramp | 0 differing pixels at each timestamp; identical SVG graphs |

**No visible Original/Port difference was detected in these samples.** Reproduce with `npm run test:browser`; `test-results/baseline/visual.json` and the paired PNGs are regenerated. The animation test controls only rAF timestamps in the test harness; production engines use the native clock. Snapshot files are local verification artifacts and are overwritten by subsequent browser-test runs.

Native samples passed keyboard text entry, Tab focus and Space activation in both engines. The port's immediate detach leaves no filters or ramp clones; manual attaches survive unwatch; moving watched elements transfers ownership. Both engines reuse warm maps, evict idle maps beyond the original limit of 24, and use CSS fallback when the Chromium sniff is absent. The UI passed position synchronization, local upload, version switching, reset and 390px viewport overflow checks.

### Initial performance measurements (no optimization)

Single sequential run, each engine in a fresh page, DPR 1. Probe: 314×218, radius 17px, defaults. Count builds via the existing `onBuild`; `attach → onBuild` includes option/geometry parsing and map generation, so it is an **upper-bound map-build observation**, not isolated CPU time. Total attach additionally includes SVG assembly. Hot reattach releases and reacquires the same map; blur retuning changes only the filter.

| Observation | Original | TS port |
| --- | ---: | ---: |
| Cold map builds | 1 | 1 |
| Cold attach → onBuild | 12.0ms | 11.4ms |
| Total cold attach | 12.8ms | 12.7ms |
| Hot reattach builds / total attach | 0 / 0.3ms | 0 / 0.4ms |
| Blur-only retune builds / time | 0 / 0.7ms | 0 / 0.7ms |
| Live resize, 30 frames: map builds | 8 | 6 |
| Live resize: longest rAF interval / intervals >50ms | 38.6ms / 0 | 26.2ms / 0 |
| Settle 120ms, 30 frames: map builds | 1 | 1 |
| Settle: longest rAF interval / intervals >50ms | 67.2ms / 1 | 24.9ms / 0 |
| Live + settle: plain-blur frames / missing filter references | 0 / 0 | 0 / 0 |

Resize changes width once per real rAF: live 314→401px, settle 214→301px, then waits for the trailing rebuild. Real-time throttling, browser JIT, system load and cache bucketing affect counts and intervals. These are baseline observations, **not evidence of a speedup**. A >50ms interval was observed for the original settle run; previous runs also varied. The checks observe filter continuity and references, not a full painted-frame/video analysis, so they do not establish universal absence of optical flashing. Raw per-run measurements: `test-results/baseline/performance.json`.

## Known limits and reproduction

- Optical parity is established for the tested Chromium/DPR/viewport and fixtures, not every browser/GPU/DPR combination. Actual Firefox/Safari rendering was not exercised; the unchanged support sniff and CSS fallback were tested in Chromium by forced-off and non-Chromium identity paths.
- Original behavior intentionally remains: elliptical radii use the horizontal value, percentages use the shorter side, buckets can stretch maps by up to 2%, the default folded field ignores two-pass smoothing, and `self` mode applies displacement only. To inspect these, choose the respective geometry/options in the playground and compare the independent original cases.
- `setOpts` still retunes all attached elements in a module; independent instances and production React components/hooks are later work. The button/input checks demonstrate native behavior and matching clear foreground text, not full design-system or cross-browser readiness.
- On Windows, give the unchanged upstream runner an explicit `--page file:///F:/.../reference/hyalite-v0.5.0/demo/cases.html` if its platform-neutral default URL does not resolve. `--browser` or `LG_CHROME` selects a local executable; rerunning against another Chromium version creates a new baseline.

No B/C/D work, npm publication or release was performed.
