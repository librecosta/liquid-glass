# LG-B validation (historical)

The prefab/global APIs described below were experimental LG-B contracts; LG-C2 removes them from package exports. Current usage is core + Hook + optional CSS: see [LG-C2](lg-c2-finalization.md).

LG-B was accepted at [`b257c17`](https://github.com/librecosta/liquid-glass/tree/b257c17), extending LG-A without changing optical algorithms/defaults. It added independent instances, four React APIs, standard ESM exports and independent tarball consumption.

`createLiquidGlass(element, options)` exposes local synchronous `setOptions`, `refresh` and idempotent `destroy`. React exposes `LiquidGlass`, `LiquidGlassButton`, `LiquidGlassInput` and `useLiquidGlass`. Instances share map/filter caches and a hidden SVG host. Legacy global retuning does not affect owned instances. Input text and its glass background are separate layers; native attributes, events, refs, forms and selection remain available.

The LG-B check passed Node contracts, strict TS, ESM/declaration/CSS builds, the former original/TS browser comparison and an external React 19 + Vite + TypeScript consumer. Historical dual-engine tests were replaced in LG-C with LibreCosta gold; [LG-C](lg-c-performance.md) records current results and performance. Do not use the old upstream-runner commands.

The independent consumer remains part of `npm run check`. It installs a real tarball outside this repository, checks strict types and SSR with throwing browser-global getters, then tests dev StrictMode and production. It verifies independent options, shared cache, repeated updates, native button/form/input behavior, refs, radius/resize, enabled versus disabled, repeated mount/unmount, interrupted materialize, zero leaked SVG/RO/MO/rAF resources, restoration of reserved properties and CSS fallback. It also rejects demo/image assets in the tarball and checks the adapted-code license is included.

Imports are SSR-safe; actual binding is client-only. React options are a complete value; instance `setOptions` merges a patch. Radius changes on a bound element are observed; inherited changes during React commits are checked. For ancestor/external stylesheet changes outside React, call `refresh()` once the new geometry applies. Actual Safari/Firefox, browser autofill/password-manager overlays and assistive-technology combinations remain unverified. See [README](../README.md) for consumption and support.
