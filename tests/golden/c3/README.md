# Balanced / Fast LG-C3 fixtures

These four images are new baselines for Issue #5, separate from the untouched original `../math.json`, `../reference.json`, `../reference/*.png`.

Captured from the C3 implementation on 2026-11-05, Chrome 156.0.8078.80 / AMD Radeon ANGLE D3D11, DPR1, viewport 500×516, scene 500×480, card 300×220 / radius 42px / position (100,142). Balanced: dispersion=0.8, sat=1, edge=0, rim=0.80. Fast: dispersion=0, sat=1, edge=0, rim=0.80. Other parameters retain the historical values. Each quality uses a fresh Chrome process; forest then precise grid. Images were visually inspected before accepting these initial baselines.

`defaults.spec.ts` verifies zero pixel differences, including after Reference→current quality updates. Balanced's first capture uses no quality/options query, so a UI-only default workaround cannot hide core/Hook regressions (also checked in the installed tarball). Do not regenerate these as part of ordinary test runs; any later visual change requires explicit review. Original Reference still selects its full preset and must pass its existing map/SVG/math/pixel goldens exactly.
