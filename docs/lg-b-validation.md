# LG-B validation

LG-B extends the accepted `e3717e8` LG-A baseline on `dev`. Frozen files in `reference/hyalite-v0.5.0/` and the optical math, map encoding, SVG graph/defaults, cache keys/buckets/limits and resize scheduling are unchanged. No optical optimization, npm publication, release or main merge is part of this work.

## Contracts

- `createLiquidGlass(element, options)` returns synchronous local `setOptions(patch)`, `refresh()` and idempotent `destroy()`. Patches do not detach/reattach or replay materialize. Identical options and callback-only updates do not reapply the filter. Destroy cancels the element's timer/ramp, disconnects its observers, releases cache references and restores the reserved CSS properties including their priorities. Updates after destroy do nothing; duplicate ownership throws.
- The original map/filter maps and SVG host remain shared in the module. Destroying the final instance removes an empty host; up to 24 idle maps remain warm under the unchanged cache policy. Legacy `Hyalite` APIs remain available; global `setOpts` retunes legacy attachments only, so component instances cannot be accidentally retuned by it.
- `LiquidGlass`, `LiquidGlassButton`, `LiquidGlassInput` and `useLiquidGlass` use that same core. React `options` are a complete value; omitted fields reset to the original defaults. Effects use layout-phase binding/cleanup and stable callback refs; React 19 object refs and callback-ref cleanup are forwarded. `enabled` controls optics, while `disabled` remains a native control attribute.
- Input optics are an aria-hidden, pointer-transparent sibling behind a real input. Native input class/style/ref stay on the input; wrapperClassName/wrapperStyle configure the glass layer's layout and inherited radius. There is no filter/blur on input text. Components impose no theme, padding or radius; explicit CSS uses low-specificity `:where` rules and opt-in classes/variables.
- A single private package exposes core, `/react` and `/styles.css`. TypeScript emits ESM `.js` and `.d.ts` with standard relative `.js` imports. React/React DOM are peers and demo dev dependencies. The root core has no React import. Library and playground build into separate `dist/` and `dist-playground/`; packing includes runtime/types/CSS and applicable MIT texts, not demo code or source aliases.

## Checks on 2026-11-04

Windows x64, Node 24.22.1, npm 9.6.7, React 19.2.0, TypeScript 5.9.3, Vite 6.4.5, headless Chrome **156.0.8078.76**.

`npm run check` combines:

| Check | Observed result |
| --- | --- |
| Frozen-file hashes, throwing-browser-global SSR import, legacy defaults/API and differential math | 4 Node tests pass |
| Library declarations/ESM/CSS and playground typecheck/build | Pass |
| Original and TS upstream Chromium cases | 32 checks each pass |
| LG-A same-Chromium, same scene/viewport, DPR 1 | All 14 static scenes have 0 differing pixels; PNG/profile info and normalized SVG graphs identical |
| LG-A materialize at 0/100/200/400ms | 0 differing pixels at all four timestamps |
| Remaining LG-A lifecycle, native samples, cache, fallback and measurements | All 9 browser tests pass; measurements retained, no speedup claim |
| Independent tarball consumer strict TypeScript | Core/react/CSS imports pass; native refs/props/events infer correctly; expected invalid option/ref/button types are rejected |
| Packed ESM SSR import and renderToString | Core/react import with throwing window/document/navigator/CSS/observer getters passes; server output contains native button/input, no SVG attachment |
| Independent consumer dev StrictMode + production | Both phases pass the runtime checks below, without page exceptions or console errors |

The consumer script uses `npm pack --ignore-scripts` after the library build, copies only `tests/consumer/` into an OS temporary directory outside the repository, installs the **tarball** and its own React/Vite/TypeScript dependencies, and runs its own strict `tsc` and production build. There are no repository aliases, source imports or symlinks. Resolution from the package and app points to the same React installation. The packed files and phase results are recorded in ignored `test-results/consumer.json`; the temporary project is retained at its printed path for inspection.

Each independent browser phase verifies:

- Same-geometry A/B instances share a canonical filter. Updating A builds one new map, leaves B's reference unchanged and creates no new observers. Repeating the update and hovering/pressing the button build no new maps. Legacy global retuning changes neither instance.
- Real button click, Space, disabled suppression, submit behavior and native refs. Controlled email entry, uncontrolled search editing/selection/caret, password value/type, Tab focus, placeholder/autocomplete/name attributes and FormData submission.
- Class-based container radius, inline resize and inherited input-wrapper radius update the correct glass geometry while another instance stays unchanged. A hook moves between section/article DOM nodes without accumulating observers.
- Disabling optics leaves native controls present and removes filters/observers; reenabling binds again. Four repeated mount/unmount cycles, including materialize ramps, finish with no SVG filters/host, active binding ResizeObservers, radius MutationObservers or rAF callbacks. Development StrictMode also exercises setup/cleanup and callback-ref cleanup.
- A core instance interrupts its ramp, performs repeated local updates without reattaching observers, safely destroys with a pending settle resize, restores preexisting custom-property priority and remains inert after destruction.
- Forced unsupported mode uses CSS blur with current options, leaves zero SVG filters and preserves input behavior. Library radius observers are counted separately from Vite's own development document observer.

The built `/components.html` was also opened and visually reviewed: local left-card parameter updates preserve the right-card filter; the native email form submits; text remains clear. The preserved `/` comparison still loads both engines. These pages demonstrate usage, not an additional UI framework.

## Reproduction and limits

Use `npm ci && npm run check` (Chrome required; `LG_CHROME` selects an executable). For isolated package validation, run `npm run build:lib && npm run test:consumer`. Dependency installation uses the npm registry with cache preference; there is no runtime service. See README for local tarball consumption and three usage examples.

Optical parity is established for the tested Chrome/DPR/fixtures. Actual Safari/Firefox, other GPU/DPR combinations, assistive technologies, browser autofill/password-manager overlays and every native input type have not been exhaustively exercised. SVG refraction remains Chromium-specific; other engines use CSS fallback. CSP needs `img-src data:` for maps (`blob:` additionally for playground local images). Original percentage/elliptical-radius and folded-field semantics remain as recorded in LG-A.

Direct class/style radius changes on a bound element are observed. React commits additionally check inherited radii, covering input wrapper updates. Pure CSS radius transitions, ancestor changes or external stylesheet changes outside React should call `refresh()` once the new geometry applies (e.g. on transition end). `force()` is the retained global detection override; remount/rebind to exercise a changed verdict. The empty input background has no foreground to displace in self mode. ESM and React 19 are the validated consumption targets; no CommonJS matrix or release infrastructure was added.
