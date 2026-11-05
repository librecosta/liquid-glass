# LG-A historical baseline

LG-A was accepted at [`e3717e8`](https://github.com/librecosta/liquid-glass/tree/e3717e8). It established a faithful TypeScript port of Hyalite v0.5.0 (upstream commit `3c7eb86d7457b437013c5e9579e9c2d6fe713f2d`), with identical math/defaults and tested Chrome output. Fourteen static scenes and four fixed materialize timestamps had zero differing pixels against the original at Chrome 156.0.8078.76, DPR 1. The original and adapted case suites each passed 32 checks.

The source snapshot, original engine, demos, runner, dual iframes and their comparison tests were intentionally removed by LG-C. They are available in Git history, rather than as another current runtime. This document records historical evidence; the old commands and artifacts are no longer the current verification path.

Current regression protection uses LibreCosta `b257c17` math, map/SVG digests and six frozen Chrome pixel scenes in `tests/golden/`. Run `npm run check`; see [LG-C measurements and limits](lg-c-performance.md). Full adapted-code MIT terms remain in [Hyalite-MIT.txt](../licenses/Hyalite-MIT.txt).

Original percentage/elliptical-radius rules, folded-field behavior and Chromium-specific SVG support remain unchanged. No optical retuning is part of LG-C.
