# M2 — Material performance, CSS contract and local dev stop

Issue [#11](https://github.com/librecosta/liquid-glass/issues/11), based on dev `3aca507`. This is a dev-only review deliverable. Package version remains 0.1.0; core, Hook, optical presets, caches, public exports and historical goldens are unchanged.

Soft now uses the approved Clearer tint: **7% on forest/dark/grid, 6% on daylight**. The permanent A/B controls are removed. Old `softVariant=current|clearer` and invalid values normalize to this default and are removed from the URL. Reset restores Clear + Balanced; selecting Soft after Reset gives Clearer. Clear and Prismatic retain their existing CSS. The reversible Prismatic optical experiment remains explicit and separate from Material and Quality. Historical Current screenshots/reports remain intact; the M1 capture script refuses to overwrite them from this M2 checkout.

## Reproduce and review

```sh
npm ci
npm run dev -- --port 5174 --strictPort
```

- [Playground / Soft / English](http://127.0.0.1:5174/?lang=en&material=soft&background=light)
- [Playground / 中文 / 20 Fast cards](http://127.0.0.1:5174/?lang=zh-CN&material=soft&background=grid&quality=Fast&instances=20)
- [Optional CSS contract prototype](http://127.0.0.1:5174/prototypes/material-contract.html) — native div/button/input, explicit theme, Balanced/Fast, disabled button and forced fallback. This is a development-only review page, excluded from the production site and npm tarball.

The public-only `instances=1|5|20` parameter initializes the real scene before its first binding, allowing cold assembly measurements without a hidden fixture. Other values fall back to one. Historical `?fixture=1` ignores this parameter and all material/background presentation parameters.

For performance measurements, build and serve the production Playground in one terminal, then run the script in another:

```sh
npm run build
npm run preview -- --port 4176 --strictPort
# Another terminal, from the repository root:
node scripts/measure-materials.mjs
```

`LG_BASE_URL` can select another production preview URL. The script uses installed Chrome. It writes all 54 trials and two separate trace summaries to [m2-material-measurements.json](m2-material-measurements.json), plus ignored raw traces under `performance-results/m2/`. Timing results are device/browser dependent; they are not CI thresholds. Stop the preview with `npm run dev:stop -- --port 4176` on Windows.

## Measurement conditions

Measured 2026-11-06 with Node 24.22.1 / npm 9.6.7, Windows 10 build 19045, AMD Ryzen 7 5800H (16 logical CPUs), 31.4 GiB RAM, installed Chrome **156.0.8078.80**, headless, no CPU/network throttling. Chrome reported **AMD Radeon integrated graphics**, ANGLE Direct3D11, driver 31.0.21921.1000; the machine's separate RTX 3070 was not the active renderer.

Every condition uses viewport 1440×1000, DPR 1, scene 1010×618, CSS precision grid, English card content, glass 400×280 with 42px radius, initial first-card position (305,169). Other cards keep the existing deterministic offsets `(305+13i) % 610`, `(169+17i) % 338`. Only the first card is dragged, over the same overlapping scene. Balanced uses dispersion 0.8; Fast uses 0; both retain sat=1, edge=0, rim=0.8 and all other existing defaults. No custom optics or recommended-optics experiment.

Each of 1/5/20 cards × Balanced/Fast × Clear/Soft/Prismatic has three fresh-context trials. Material order rotates and quality order alternates across trials. Each trial records cold assembly, two real Material button clicks (alternate material, then back), and 60 mouse moves with confirmed pointer capture. The harness requests an 8ms host pause between moves; actual input dispatch is slower under load and recorded in the data. This is a controlled interaction benchmark, not a fixed-rate hardware pointer test.

**rAF intervals measure callback scheduling; DOM intervals measure observed position-style mutations. Neither is painted/presented FPS.** Below, rAF and DOM columns show the median of the three per-trial p95 values, with their min–max range in brackets. Switch CPU is the median CDP `TaskDuration` delta across the two switches, in ms; it includes the Playground/React/URL/button interaction and harness-related browser tasks, not isolated CSS execution or GPU time. All per-round values, raw intervals, dispatch timings and CDP deltas are in the JSON.

| Cards | Quality | Material | rAF p95 ms, median [range] | DOM p95 ms, median [range] | Two-switch main thread ms |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | Balanced | Clear | 12.6 [12.6–12.6] | 29.0 [29.0–29.3] | 20.5 |
| 1 | Balanced | Soft | 12.6 [12.5–12.6] | 29.1 [24.9–29.2] | 21.7 |
| 1 | Balanced | Prismatic | 12.5 [12.5–12.6] | 29.1 [25.1–30.4] | 21.6 |
| 1 | Fast | Clear | 4.3 [4.3–4.3] | 27.2 [16.9–29.3] | 19.4 |
| 1 | Fast | Soft | 4.3 [4.3–4.3] | 25.2 [17.4–29.1] | 20.6 |
| 1 | Fast | Prismatic | 4.3 [4.3–4.3] | 20.8 [16.9–29.2] | 21.5 |
| 5 | Balanced | Clear | 58.4 [54.3–62.5] | 61.1 [58.4–66.8] | 22.4 |
| 5 | Balanced | Soft | 58.4 [54.3–62.5] | 61.0 [57.7–63.4] | 23.5 |
| 5 | Balanced | Prismatic | 62.4 [58.4–62.5] | 62.8 [58.1–66.2] | 24.4 |
| 5 | Fast | Clear | 33.4 [33.4–37.5] | 35.8 [33.5–36.2] | 22.6 |
| 5 | Fast | Soft | 33.3 [33.3–54.2] | 33.6 [33.2–59.9] | 22.9 |
| 5 | Fast | Prismatic | 33.3 [33.3–45.9] | 33.5 [33.4–52.3] | 24.0 |
| 20 | Balanced | Clear | 229.2 [216.7–266.7] | 242.9 [218.3–266.5] | 32.5 |
| 20 | Balanced | Soft | 229.2 [216.6–266.7] | 259.5 [222.4–273.2] | 37.9 |
| 20 | Balanced | Prismatic | 241.7 [212.5–254.2] | 242.4 [216.5–275.3] | 35.1 |
| 20 | Fast | Clear | 133.3 [129.2–137.5] | 141.4 [140.0–152.2] | 27.3 |
| 20 | Fast | Soft | 129.2 [129.2–133.4] | 137.6 [131.3–145.4] | 29.1 |
| 20 | Fast | Prismatic | 129.2 [129.1–141.6] | 136.4 [130.6–155.3] | 31.7 |

All **54 cold assemblies produced 1 map / 1 PNG / 1 shared SVG filter**, including the 5/20-card cases: identical geometry/options reuse the existing cache. These counts do not mean there is only one glass DOM binding. All material switches and drags produced **0 extra maps / 0 extra PNGs**, retaining the original first-card DOM, option object, filter nodes and filter markup. Material is not secretly changing Quality.

Cold assembly below aggregates the nine trials per card-count/quality (three materials × three trials). Values are median [range], ms. Wall time includes navigation, font readiness and an intentional 250ms settling delay; it is **not pure engine construction time**. CDP main-thread time includes the application startup. PNG time instruments `toDataURL`, not complete map generation.

| Cards | Quality | Assembly wall ms | Startup main thread ms | PNG encoding ms |
| ---: | --- | ---: | ---: | ---: |
| 1 | Balanced | 470.7 [447.7–567.0] | 183.5 [164.1–254.2] | 3.9 [3.0–34.6] |
| 1 | Fast | 462.6 [440.3–496.2] | 176.0 [166.6–201.4] | 3.8 [3.1–4.9] |
| 5 | Balanced | 473.2 [452.1–493.5] | 181.4 [176.7–202.1] | 4.2 [3.6–4.9] |
| 5 | Fast | 463.6 [446.8–512.2] | 174.4 [171.6–222.3] | 4.1 [3.6–4.4] |
| 20 | Balanced | 480.9 [469.1–572.2] | 195.8 [190.7–259.4] | 4.2 [3.9–7.6] |
| 20 | Fast | 478.5 [458.9–508.0] | 195.5 [180.3–217.5] | 4.1 [3.7–4.4] |

Two additional **trace-only** 20-card Balanced drags are excluded from these timing aggregates. Chrome 156 exposed `PrePaint`, `UpdateLayer`, `Commit` and compositor pipeline events, but no exact `Paint` / `RasterTask` event names in these captures. The summaries retain phase counts instead of silently treating missing names as zero rendering cost.

| Trace | PrePaint complete events / summed ms | UpdateLayer complete events / summed ms | Submit-to-presentation async begins |
| --- | ---: | ---: | ---: |
| Clear | 80 / 9.055 | 596 / 0.697 | 164 |
| Prismatic | 84 / 9.606 | 535 / 0.588 | 166 |

These are browser pipeline observations across threads, with tracing overhead. Async starts are not confirmed presented frames; summed event durations are not GPU time. This evidence does not isolate the skin's marginal compositor cost or establish a CSS/GPU-free path.

**Conclusion:** instance count and Quality dominate this device's measurements. Twenty overlapping cards are slow in both qualities: approximately 11–13 seconds for a Balanced 60-move interaction, 7 seconds for Fast. Three trials show variation and do not establish a reliable performance ranking among skins. Soft's lighter tint is a visual decision, not a claimed optimization. No core rewrite or tuning was performed to improve these numbers.

## Recommended optional CSS contract — draft, not an export

**Recommendation for this milestone: keep the production materials Playground-only**, and review the separate usable [prototype stylesheet](../prototypes/materials.css) / [HTML example](../prototypes/material-contract.html) before deciding whether to distribute an optional `materials.css`. The existing `styles.css` stays minimal and compatible. Nothing new is added to npm exports or the package allowlist.

| Responsibility | Draft owner / boundary |
| --- | --- |
| Refraction and Quality | Existing `createLiquidGlass` / `useLiquidGlass`, `QUALITY_PRESETS` and `styles.css`; never a material class or theme attribute |
| Material selection | Explicit opt-in `.material-prototype[data-lg-material="clear\|soft\|prismatic"]`; draft selectors only |
| Theme | Caller sets ancestor `data-lg-theme="light\|dark"`; absence uses dark tint; no media-query or wallpaper sampling inference |
| Decoration | Background and `::after` gloss/shadow only; no `filter`, `backdrop-filter`, `--hyalite` or `--hyalite-edge` overrides |
| Application | Actual HTML, geometry, positioning, text contrast, typography, focus-visible, disabled state, events and accessibility |

The prototype's opt-in class establishes `position:relative`; `::after` is absolute with `inset:0`, inherited radius and `pointer-events:none`. An application using absolute/fixed/sticky positioning must override the opt-in positioning and retain its own containing block. The skin consumes `::after`; it cannot safely coexist with arbitrary existing application `::after` decoration. Clipping/stacking and descendant layouts remain the caller's responsibility. Do not make this an unconditional global selector or silently add clipping that could hide focus outlines.

Native divs and buttons can own the decorative surface, while native semantics, disabled state and keyboard handling stay on the element. Native/replaced inputs must **not rely on `::after` support**: the prototype uses a separate `aria-hidden` glass span below a transparent native input, with pointer events disabled on the decoration. Input selection, focus and forms remain native. The prototype's app CSS supplies contrasting text and visible focus; the optional skin must not promise readability on arbitrary photographs. Forced fallback destroys engine bindings while keeping the existing CSS blur fallback and usable native content. No Card abstraction or new component library is introduced.

Before any future distribution decision, review selector naming, specificity, positioning/pseudo ownership and supported native-host boundaries. The current prototype demonstrates the boundary but does not freeze a public contract or claim a complete cross-browser accessibility audit.

## Windows PowerShell dev:stop

```powershell
npm run dev:stop                   # all verified Vite dev/preview services of this checkout
npm run dev:stop -- --port 5174     # select one listener
```

Ordinary `npm run dev -- --port 5174` and `npm run preview` remain compatible. A small Vite config plugin records resolved repository root, actual Vite CLI identity, PID, process creation ticks, command hash, mode and bound port in ignored `.vite/dev-services/`. No new dependency, start wrapper, daemon or raw command-line log is required.

The PowerShell shutdown command checks the current listener, Node process, exact root/mode, start ticks and command hash against that record. It explicitly retains a process handle before identity checks and kills through that handle, avoiding a later blind PID lookup. Unknown ownership or identity mismatch prints PID/ports/reason, refuses that target and exits nonzero; it never kills by process name or port alone. Other verified targets may still be stopped. A free selected port or no matching service returns success. Dead records are ignored; live reused PIDs fail identity checks.

This implementation supports Windows PowerShell with `Get-NetTCPConnection` and CIM permissions. It respects local PowerShell execution policy; no bypass, administrator escalation or cross-platform kill fallback. Non-Windows reports unsupported and exits nonzero. A service started before this config was loaded needs a normal config reload or restart to register. A different checkout, unknown API-hosted Vite server or inaccessible process remains refused; no guess based only on a CLI path is trusted.

Windows integration tests use disposable roots whose paths contain spaces and Chinese characters. They start two own dev servers, an own preview, another project's Vite and a plain Node HTTP server. Verified targeted/default shutdown, repeated/free-port calls, foreign-process rejection, missing record and tampered start ticks all pass; the foreign services remain alive until test-owned child-handle cleanup. An actual root command stopped existing dev PID 37240 on 5174; repeating it succeeded without stopping dev 5173 or preview 4176. Remaining own services were closed after validation using the default command.

## Validation and review boundary

- `npm run check`: **passed**, 5 Node tests and 39 browser tests, TypeScript/library/Playground builds, independent tarball core-only/types/SSR, React consumer StrictMode/production/native forms/lifecycle/fallback, production root and `/liquid-glass/` paths. Tarball remains the original 17-file allowlist; no prototype CSS export.
- Windows exact Reference and Balanced/Fast screenshot goldens, mathematical/map/SVG contracts and fixture tests passed without changing goldens. CI retains its existing portable map/SVG contracts and skips only the two platform-specific exact screenshot tests on Ubuntu; Windows dev-stop integration explicitly skips outside Windows.
- Material/URL/Reset tests cover English/Chinese, old variants, keyboard switching, preserved filter/DOM/input state, daylight/dark backgrounds, upload and real drag/fallback at 390px. Existing site tests cover both pages/languages at 390/768/1440/1920px. Prototype native controls/fallback pass at 390px; actual dark desktop/light mobile screenshots were also inspected locally.
- Additional strict TypeScript check of the Vite plugin/config passed. The Windows integration test was rerun successfully after adding the missing-record refusal case.

Ready for owner review of the performance data and proposed boundary. Multi-instance rendering cost remains visible; optional material distribution/naming is deliberately unapproved. No main merge, npm publication, tag, Release, Pages deployment, algorithm change or package API change.
