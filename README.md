# Liquid Glass

[English](README.md) · [简体中文](README.zh-CN.md) · [CI](https://github.com/librecosta/liquid-glass/actions/workflows/ci.yml)

A headless liquid-glass renderer with a native TypeScript core and one React Hook. Bind real refraction to your own HTML. Keep complete control of your CSS, layout and native interactions.

**v0.1.0** · [npm](https://www.npmjs.com/package/@librecosta/liquid-glass) · [Release notes](https://github.com/librecosta/liquid-glass/releases/tag/v0.1.0)

![The Liquid Glass Playground: an interactive glass card over a local forest, with a dark property editor](https://raw.githubusercontent.com/librecosta/liquid-glass/main/docs/playground.webp)

## Features

- Framework-independent ESM core; React 19 integration through `useLiquidGlass`.
- Independent instances, shared map/filter caches, resize handling and explicit cleanup.
- Balanced by default; switch to Fast on the same instance when performance matters.
- Your divs, buttons and inputs. No prescribed component designs or UI framework.
- A responsive Playground with forest/grid/local-image backgrounds, real dragging and English/简体中文 controls.

## Installation

```sh
npm install @librecosta/liquid-glass@0.1.0
```

The core has no runtime dependencies and installs without React. React `^19.0.0` is an optional peer required only by `/react`; a React DOM app supplies its own React DOM. Validation uses independent projects without aliases or symlinks, including a core-only app and a React/React DOM 19.2.0 app.

## Quick Start

### TypeScript / JavaScript

Create the element and its appearance yourself. Place it over a detailed background to see refraction:

```html
<div class="my-glass liquid-glass">Your content</div>
<style>
  .my-glass {
    width: 300px;
    min-height: 180px;
    padding: 24px;
    border-radius: 32px;
  }
</style>
```

```ts
import { createLiquidGlass, QUALITY_PRESETS } from "@librecosta/liquid-glass";
import "@librecosta/liquid-glass/styles.css"; // optional effect rules

const glass = createLiquidGlass(
  document.querySelector<HTMLElement>(".my-glass")!,
);
// No options = Balanced.
glass.setOptions(QUALITY_PRESETS.Fast);
glass.setOptions({ ...QUALITY_PRESETS.Balanced, rim: 0.5 });
glass.refresh(); // after external stylesheet/ancestor geometry changes
// glass.destroy(); // when the element is no longer needed; safe to repeat
```

### React Hook

```tsx
import { useLiquidGlass } from "@librecosta/liquid-glass/react";
import { QUALITY_PRESETS } from "@librecosta/liquid-glass";
import "@librecosta/liquid-glass/styles.css";

export function MyButton({ fast = false, disabled = false }) {
  const { ref } = useLiquidGlass<HTMLButtonElement>({
    options: fast ? QUALITY_PRESETS.Fast : undefined,
  });
  return (
    <button
      ref={ref}
      className="liquid-glass my-button"
      type="button"
      disabled={disabled}
    >
      Save
    </button>
  );
}
```

Define `.my-button` with your own spacing, radius, colors and focus state. `useLiquidGlass()` without configuration uses Balanced. The Hook returns `ref` and `refresh`; `enabled` controls the effect independently of native `disabled`. A state/prop change updates the existing binding without remounting.

For inputs, bind the glass to a decorative `pointer-events:none` background layer and place a transparent native input above it. Text, caret, selection and forms remain native. See the runnable [Hook examples](https://github.com/librecosta/liquid-glass/blob/main/src/components-demo.tsx) for controlled email input, independent instances and native buttons.

## Optional materials — unreleased v0.1.1 candidate

The `dev` branch adds `@librecosta/liquid-glass/materials.css`. **Published v0.1.0 does not include this entry.** Install the local tarball described under [Development](#development) to try it; the candidate package version is still 0.1.0 pending release approval.

Import `styles.css` for base refraction rules, then `materials.css` for optional skins. `QUALITY_PRESETS` independently controls optics; selecting Prismatic never changes Quality. Clear preserves the v0.1.0 Playground tint; Soft uses 7% tint (6% with explicit light theme); Prismatic uses neutral gradients and gloss.

```html
<div class="liquid-glass material-demo" data-lg-material="clear">Your div</div>
<button class="liquid-glass material-demo" type="button"
  data-lg-material="soft" data-lg-theme="light" data-lg-decorate>Save</button>
<label>Email
  <span class="field-stack">
    <span class="liquid-glass field-surface" aria-hidden="true"
      data-lg-material="prismatic" data-lg-theme="light" data-lg-decorate></span>
    <input class="field-input" name="email" type="email" autocomplete="email">
  </span>
</label>
```

```css
/* Application CSS: geometry, positioning, contrast and native control states. */
.material-demo { position: relative; width: 280px; padding: 24px; border: 0; border-radius: 28px; font: inherit; color: inherit; }
.field-stack { position: relative; display: inline-grid; border-radius: 12px; }
.field-surface { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.field-input { position: relative; min-width: 0; padding: 12px; border: 0; border-radius: inherit; background: transparent; font: inherit; color: inherit; }
.material-demo:focus-visible, .field-input:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.material-demo:disabled { opacity: .5; }
```

```ts
import { createLiquidGlass } from "@librecosta/liquid-glass";
import "@librecosta/liquid-glass/styles.css";
import "@librecosta/liquid-glass/materials.css";

const surfaces = Array.from(document.querySelectorAll<HTMLElement>(".material-demo, .field-surface"));
const bindings = surfaces.map(element => createLiquidGlass(element));
// On removal: bindings.forEach(binding => binding.destroy());
```

The same attributes work on your React elements alongside the existing Hook `ref`; there is no material JS API. Both `.liquid-glass` and `data-lg-material="clear|soft|prismatic"` are required. Set `data-lg-theme="light|dark"` **on each surface**; missing/unknown theme uses the dark tint, with no ancestor or system-theme inference. Text contrast, layout, radius, focus, disabled state, clipping and stacking remain yours.

`data-lg-decorate` explicitly reserves an **unused `::after`** for Soft/Prismatic gloss and shadow. Omit it when your element already owns that pseudo-element: only the tint/gradient applies. The host must supply a positioning context; the skin never changes absolute/fixed/static positioning. Use an independent `aria-hidden` layer for native inputs as above. Host rules have one-attribute specificity, so application classes loaded later can override them. See the [candidate contract and acceptance](docs/v0.1.1-material-contract.md).

## Configuration

Presets are parameter combinations for the same renderer:

| Configuration                     | dispersion |  sat | edge |  rim |
| --------------------------------- | ---------: | ---: | ---: | ---: |
| Balanced — default                |        0.8 |    1 |    0 | 0.80 |
| Fast — performance choice         |          0 |    1 |    0 | 0.80 |
| Reference — historical regression |        1.6 | 0.86 | 0.32 | 1.76 |

Fast removes chromatic separation. Reference restores the complete original configuration; it is not the recommended default. Optical Balanced remains an explicitly labeled historical experiment in the Playground.

Any optical field can be overridden, including bevel, thickness, blur, shade and light direction. Core `setOptions` merges a local patch; Hook `options` are a complete value, so omitted fields return to defaults. Balanced/Fast explicitly set all four quality fields. Materialize plays on binding, not updates. Radius changes on the bound DOM are observed; use `refresh()` for external stylesheet/ancestor changes.

The existing `styles.css` only consumes `--hyalite` and `--hyalite-edge`; it sets no button/input layout, radius, font, padding or border. Without it, use those variables in your own `backdrop-filter` and `box-shadow` rules. Self mode instead uses `filter` (the base stylesheet provides `[data-liquid-glass-self]` rules). The separate candidate `materials.css` owns optional backgrounds/decoration only. The public API is core + one Hook, with no prefab components or global manager.

## Browser Support

Chromium provides SVG backdrop refraction. Other engines receive CSS blur fallback; real Safari/Firefox, password managers and assistive-technology combinations still need broader testing. Five or more overlapping surfaces can be expensive; use Fast and measure on your target device. rAF callbacks are not a painted-FPS guarantee.

Strict CSP must permit map images with `img-src data:`; the Playground also needs its local image asset and `blob:` uploads. CSP denial is not automatically detected. Existing folded-field, percentage/elliptical-radius and overlapping-filter limitations remain. Imports and Hook server rendering are SSR-safe; DOM binding is client-only.

The distributed ESM targets ES2022. Node 24+ is required for this repository's development/build tools, not for browser consumers. SSR is tested on Node 24 with React 19.2.0; a minimum Node runtime version is not claimed.

## Development

```sh
npm ci
npm run dev       # http://127.0.0.1:5173
npm run dev:stop  # Windows: verified dev/preview only; add -- --port 5174 to select one
npm run check     # Node, types/builds, browsers, tarball apps, production root/subpath
npm run build     # dist/ library + dist-playground/ website
```

To test a local package, run `npm pack` after `npm ci`, then install the resulting `librecosta-liquid-glass-0.1.0.tgz` by its file path in another app. After publication, `npm run test:consumer -- --registry` validates the exact Registry version against the checked-out release commit, including its integrity, core, Hook, types and licenses.

Use `/` for the Playground and `/components.html` for Hook examples. English is the default; language persists locally and can be shared with `?lang=en` or `?lang=zh-CN`. Quality links accept `?quality=Fast` or `?quality=Reference`. Images never leave the browser.

For a local production build at the GitHub Pages project path:

```sh
npm run build:pages
npm run preview:pages -- --port 4175
# http://127.0.0.1:4175/liquid-glass/?lang=en&quality=Fast
# http://127.0.0.1:4175/liquid-glass/components.html?lang=zh-CN
```

This creates `dist-pages/` for local review; public hosting is not enabled. Confirm the photo's original rights or replace it before hosting. The [release checklist](docs/v0.1.0-release-checklist.md) records the verification process and remaining photo/hosting limits.

Local checks use installed Chrome (`LG_CHROME` can select an executable). CI uses the Chromium revision pinned by Playwright: `npx playwright install --with-deps chromium`, then set `LG_BROWSER=chromium`. Ubuntu runs all behavior, SSR and consumer checks, original exact Node math, and decoded map/SVG contracts. Windows Chrome pixel goldens stay unchanged and run on their compatible capture environment; Ubuntu explicitly skips those two platform-specific screenshot tests. `LG_EXACT_PIXELS=1` opts into the exact screenshots; `0` skips them. Stable `?fixture=1` remains a separate 500×480 regression scene, independent of the responsive website and UI language.

CI validates pushes to `dev`/`main` and pull requests, including both production entries at `/` and `/liquid-glass/`. It does not publish, deploy, tag or create Releases. See the [release checklist](docs/v0.1.0-release-checklist.md) for verification and [LG-D notes](docs/lg-d-validation.md) for the website baseline; earlier experiments remain historical records.

## License

Code: MIT. The adapted renderer retains the complete [Hyalite MIT notice](licenses/Hyalite-MIT.txt). The forest photo has an owner-supplied CC0 report without independently verified original-source evidence; the repository's MIT is not proof of photo rights. The photo and derived preview images stay outside the npm tarball. See [third-party notices](THIRD_PARTY_NOTICES.md). An independent [LibreCosta](https://github.com/librecosta) project.
