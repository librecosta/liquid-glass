# Liquid Glass

Current scope: [Issue #3](https://github.com/librecosta/liquid-glass/issues/3), LG-C, on `dev`.

- `src/core/`: the only rendering engine; framework-independent TypeScript ESM. Reference optical math, defaults, map encoding, buckets, cache and resize rules remain frozen at `b257c17`.
- `src/index.ts`, `src/react/`, `src/styles.css`: core, four React APIs, explicit opt-in CSS. Instances are independent; maps and SVG host are shared. Imports must remain SSR-safe.
- `src/main.tsx`, `src/scene-view.tsx`, `src/drag.ts`: single-engine playground, DOM position updates coalesced per frame, final React state on release/cancel. `/components.html` exercises real React APIs.
- `src/quality.ts`: Reference default; Balanced/Fast are explicit lossy experiments on the same engine. Never silently lower Reference quality.
- `src/assets/forest.jpg`: local playground-only photo. Permission/provenance and SHA are in its JSON and `THIRD_PARTY_NOTICES.md`. Do not bundle it into the library.
- `tests/golden/`: frozen LibreCosta math, map/SVG digests and Chrome pixels captured from `b257c17`; do not regenerate gold to conceal regressions. Upstream source snapshots/runner were deliberately removed. Preserve the full `licenses/Hyalite-MIT.txt` in tarballs.
- `tests/consumer/`, `scripts/verify-consumer.mjs`: independent tarball, strict TS, SSR, dev StrictMode, production, forms, lifecycle/cache and fallback checks without source aliases.
- `docs/lg-c-performance.md`: measurement method, actual results, quality images, limitations. `scripts/benchmark.mjs` reproduces measurements; historical BEFORE worktrees stay outside this repository.

Use Node 24+, `npm ci`, then `npm run check` (Chrome required; `LG_CHROME` selects an executable). `dist/` is library output; `dist-playground/` is the demo. Optimize only evidenced overhead; do not retune optical algorithms or introduce a renderer/Worker without measurements. No npm publication, main merge, Release or large UI library in LG-C. Keep adapted MIT notices.
