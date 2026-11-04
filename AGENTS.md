# Liquid Glass

Current scope is [Issue #2](https://github.com/librecosta/liquid-glass/issues/2), LG-B, preserving the accepted LG-A baseline.

- `reference/hyalite-v0.5.0/`: frozen upstream files; do not edit. `UPSTREAM.json` pins commit and SHA-256 hashes.
- `src/core/`: framework-independent TS ESM port. Keep optical math, defaults, cache and resize semantics equivalent to the reference. No browser globals at import time.
- `src/index.ts`, `src/react/`, `src/styles.css`: core, four React APIs and explicit opt-in CSS; one package, two ESM entries.
- `src/main.tsx`, `src/frame.tsx`: preserved LG-A comparison. `components.html` demonstrates the actual React APIs.
- `tests/`: Node contracts plus adapted upstream Chromium cases, exact visual comparisons and measurement-only performance baseline.
- `docs/lg-a-baseline.md`: verification results and deliberate integration differences.
- `tests/consumer/`, `scripts/verify-consumer.mjs`: standalone tarball consumption, strict TS, SSR, dev StrictMode and production browser verification, without repository aliases or links.

Use Node 24+, `npm ci`, then `npm run check` (Chrome required; `LG_CHROME` accepts an executable path). Instance updates must remain local while caches/host stay shared; preserve the legacy baseline API. Never optimize optical algorithms, publish npm, merge main or add a large UI system in LG-B. Keep MIT notices with adapted code. `dist/` is the library output; `dist-playground/` is the demo output.
