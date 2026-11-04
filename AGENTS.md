# Liquid Glass

Current scope is [Issue #1](https://github.com/librecosta/liquid-glass/issues/1), LG-A only.

- `reference/hyalite-v0.5.0/`: frozen upstream files; do not edit. `UPSTREAM.json` pins commit and SHA-256 hashes.
- `src/core/`: framework-independent TS ESM port. Keep optical math, defaults, cache and resize semantics equivalent to the reference. No browser globals at import time.
- `src/main.tsx`, `src/frame.tsx`: comparison UI and isolated engine fixture; these are experiments, not a component library.
- `tests/`: Node contracts plus adapted upstream Chromium cases, exact visual comparisons and measurement-only performance baseline.
- `docs/lg-a-baseline.md`: verification results and deliberate integration differences.

Use Node 24+, `npm ci`, then `npm run check` (Chrome required; `LG_CHROME` accepts an executable path). Do not optimize algorithms, add production React APIs or publish packages in LG-A. Keep MIT notices with adapted code.
