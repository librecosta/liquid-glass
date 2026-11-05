# Liquid Glass

Current scope: [Issue #4](https://github.com/librecosta/liquid-glass/issues/4), LG-C2, on `dev`.

- `src/core/`: the only rendering engine. Reference math/defaults/maps/encoding/cache/resize stay frozen at `b257c17`, including `edge=0.32`, `rim=1.76`. Legacy facade is internal; do not rewrite it for API cleanup.
- `src/index.ts`: public `createLiquidGlass`, `DEFAULTS`, `QUALITY_PRESETS`, `supported`, `LiquidGlass*` types. `src/react/`: only `useLiquidGlass` and types. No public prefab components, global management or default facade export. One package, two JS entries and optional CSS.
- `src/styles.css`: minimal low-specificity effect rules only; native DOM/layout/styles belong to applications. `src/components-demo.tsx` is a Hook DIY example, not a component library. Inputs use a separate decorative glass layer beneath a transparent native input.
- `src/main.tsx`, `src/scene-view.tsx`, `src/drag.ts`: single-engine Playground. Initial example explicitly overrides only edge=0; Reference/Reset restores all historical values. Position writes coalesce per rAF; final React state on release/cancel.
- `src/quality.ts`: Reference unchanged; Balanced/Fast and Optical Balanced are explicit lossy experiments. `src/finish-experiments.ts` defines private UI/measurement ablations; do not automatically promote a candidate to library defaults.
- `tests/golden/`: frozen math/map/SVG/Chrome pixels; never regenerate to hide regressions. `tests/consumer/` and `scripts/verify-consumer.mjs`: real external tarball, strict types/export contracts/SSR/StrictMode/native forms/lifecycle/cache/fallback. The old component declarations must stay absent from public exports.
- `src/assets/forest.jpg`: local demo-only photo, never a library dependency. Provenance/permission in JSON and THIRD_PARTY_NOTICES; full adapted MIT in `licenses/Hyalite-MIT.txt`, included in tarballs.
- `docs/lg-c2-finalization.md`: current review guide/results. `scripts/measure-finish.mjs`: six variants, 1/5 cards, DPR1/2, three repeats; fresh processes for comparable captures. Older LG-A/B/C records are historical.

Node 24+, `npm ci`, `npm run check` (Chrome; `LG_CHROME` override). `dist/` is the library, `dist-playground/` the demo. No main merge, npm publication, Release, UI framework, new renderer/Worker or unauthorized algorithm rewrite. Keep Reference and third-party license notices intact. User aesthetic review decides any later default change or issue closure.
