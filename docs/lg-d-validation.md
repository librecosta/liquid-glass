# LG-D — Public Playground acceptance

Based on `b6d8875`, on `dev`. Headless Core, React Hook, optical defaults, refraction math, caches, resize and drag scheduling remain unchanged. The public canvas now follows its responsive container; the existing `?fixture=1` scene retains its fixed 500×480 geometry, DOM and copy.

## Website

Dark blue-gray surfaces and a restrained ice accent frame the local forest. Desktop gives the preview most of the width and places a 320–340px property editor beside it. At 900px and below the page becomes a single column. Properties use document scrolling; advanced parameters use native details. No UI framework, extra renderer, downloaded font or continuous decorative animation was added.

Both pages use the same translated native controls. English is the default; a valid `lang=en|zh-CN` query overrides persisted language. Navigation and copied links preserve language. Titles, descriptions, feedback, form validation and accessible labels use the dictionary. Technical API/type/preset names remain recognizable.

| Viewport width | Playground EN / 简中 | Hook DIY EN / 简中 | Layout                                |
| -------------- | -------------------- | ------------------ | ------------------------------------- |
| 390px          | Pass / Pass          | Pass / Pass        | Single column, no horizontal overflow |
| 768px          | Pass / Pass          | Pass / Pass        | Single column, broad stage            |
| 1440px         | Pass / Pass          | Pass / Pass        | Large stage + right inspector         |
| 1920px         | Pass / Pass          | Pass / Pass        | Large stage + right inspector         |

All 16 combinations also pass with every advanced group expanded. Checks cover page width, visible control/text bounds, natural inspector overflow and console errors. Actual screenshots were visually reviewed at all four widths. [README preview](playground.webp) is a real 1440×1040 Windows Chrome capture of the running English page, with Geometry collapsed; WebP quality 88, **166,680 bytes**. It has no compositing or synthetic image content.

Keyboard checks include skip navigation, native details via Enter, focus rings, range arrows, segmented quality selection via Space, input focus/Tab order and native submission. Numeric controls accept sequential typing, empty drafts and negative values; blur/Enter commits limits. Local upload success/failure, translated feedback, grid/forest, content/geometry changes, pointer capture, cancellation and keyboard drag are covered.

## Validation

Windows Chrome **156.0.8078.80**, Node 24: `npm run check` passes:

- 4 Node contracts, including original exact math and complete dictionaries.
- Strict TypeScript, library build and both website entries.
- 30 browser tests, including 16 responsive/bilingual combinations.
- Real independent tarball installation, strict consumer build, SSR imports/server rendering, development StrictMode, production, native forms, instance isolation, refs, resize, fallback and cleanup.
- Original Reference six scenes: unchanged full-state digests and **0 pixel differences**. Separate C3 Balanced/Fast forest/grid fixtures also remain **0 pixel differences** before and after switching.

Responsive five-card drags at 390px and 1440px, after Fast→Balanced switching, retain the same filter and produce **0 map builds, 0 PNG encodes, 0 ResizeObserver callbacks and 1 final React commit** per drag. These are functional performance invariants, not new FPS measurements or claims of faster optics.

## CI and regression boundaries

The Node 24 Ubuntu workflow runs `npm ci`, installs Playwright's pinned Chromium and dependencies, then runs the same `npm run check`, including the external tarball consumer. Lockfile download URLs use the official npm registry; all dependency versions and integrity hashes are unchanged. Permissions are read-only; failed browser diagnostics are retained. No publication, deployment, release or version automation exists.

Ubuntu skips only the two Windows Chrome exact screenshot tests, using `LG_EXACT_PIXELS=0`. Original math, raw state goldens and PNG files are not regenerated. A separate portable contract checks exact decoded map pixels/dimensions, SVG, edge CSS and rendering metadata across six Reference cases plus Balanced/Fast. It ignores PNG compression and generated IDs. Diagnostic raw profiles/maxDisplacement are excluded because V8 versions differ at floating-point last bits; their rendered map/SVG output is compared without tolerance. Original exact Node math and Windows full-state checks continue independently.

Local CI-browser preflight (`LG_BROWSER=chromium`, `LG_EXACT_PIXELS=0`) also passes the full `npm run check`: 4 Node tests, TypeScript/builds, 28 browser tests with the two intended Windows-pixel skips, and the independent tarball/SSR/StrictMode consumer. This includes the portable eight-case rendering contract and all 20 public website tests. The live workflow result for the pushed commit is available in [GitHub Actions](https://github.com/librecosta/liquid-glass/actions/workflows/ci.yml).

## Remaining limits

Real Safari/Firefox, physical touch devices and assistive-technology combinations need broader testing. Automated keyboard and native form checks do not establish a complete accessibility audit. Historical folded-field, elliptical-radius, overlapping-filter and CSP limitations remain as documented in the README; LG-D changes presentation only. No public hosting deployment was requested; `npm run dev` and `npm run build` provide the runnable website. Earlier performance reports are retained at their recorded configurations, rather than reinterpreted for a larger responsive workload.
