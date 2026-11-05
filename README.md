# Liquid Glass

A Headless-first liquid-glass renderer: a framework-independent ESM core and one React 19 Hook. An independent [LibreCosta](https://github.com/librecosta) project.

Experimental, private, local tarball consumption only; no npm release. One package provides `@librecosta/liquid-glass`, `/react` and optional `/styles.css`. You own the DOM, appearance and native semantics. There are no public prebuilt card/button/input components.

```js
import {createLiquidGlass} from '@librecosta/liquid-glass';
import '@librecosta/liquid-glass/styles.css'; // optional, low-specificity effect rules
const element = document.querySelector('.my-surface');
element.classList.add('liquid-glass'); // your own radius, spacing, border, etc.
const glass = createLiquidGlass(element, {edge: 0}); // explicit example override
glass.setOptions({thickness: 45}); // local patch, no remount
glass.refresh(); // after external stylesheet/ancestor geometry changes
// glass.destroy(); // idempotent cleanup when no longer needed
```

```tsx
import {useLiquidGlass} from '@librecosta/liquid-glass/react';
import '@librecosta/liquid-glass/styles.css';
function MyButton() {
  const {ref} = useLiquidGlass<HTMLButtonElement>({options: {edge: 0}});
  return <button ref={ref} className="liquid-glass" type="submit">Save</button>;
}
```

The Hook returns `ref` and `refresh`, accepts `enabled` independently of native `disabled`, and binds to your div, button, section, or decorative background layer. For inputs, put the Hook on an absolutely positioned, `pointer-events:none` background span; keep the real input transparent, above it, with its own native ref. See the [DIY example](src/components-demo.tsx) for controlled email, forms, focus and disabled behavior. No filter is applied to input text/caret. Navigation, dialogs and other layouts can use the same binding.

Public core exports are `createLiquidGlass`, `DEFAULTS`, `QUALITY_PRESETS`, `supported` and `LiquidGlass*` types. React exports only `useLiquidGlass` plus its types. The old global facade/watch/attach/setOpts machinery is internal, retained for regression tests, and not a package API. The unreleased prefab component exports have been removed.

Instances share maps and the hidden SVG host while options remain independent; duplicate ownership throws. Core `setOptions` merges patches; Hook `options` are a complete value, with omitted fields reset to defaults. Radius changes on bound DOM are observed; inherited changes during React commits are checked. Call `refresh()` for external ancestor/stylesheet changes. Materialize plays on binding, not updates. Destruction restores reserved `--hyalite`/`--hyalite-edge` values. SSR imports/rendering and development StrictMode are checked; binding is client-only. Optional CSS contains only effect rules, with no input layout, borders, radius, font or padding. Without it, consume those reserved variables in your own CSS; `self` mode also needs the appropriate `filter` styling/data attribute.

**Reference remains the library default**, including dispersion 1.6, sat 0.86, edge 0.32 and rim 1.76. Balanced/Fast remain lossy experiments. Optical Balanced is a new explicit candidate: dispersion 1.6, sat 1, edge 0, rim 1.76. It preserves chromatic separation but removes edge desaturation and the CSS outline; it is not a lossless replacement. Pass `QUALITY_PRESETS['Optical Balanced']` to opt in. No SDF, map resolution/quantization or renderer changes were made. See [LG-C2 comparison and measurements](docs/lg-c2-finalization.md).

## Run and consume locally

Node 24+, npm, Chrome for browser checks (`LG_CHROME` selects an executable):

```sh
npm ci
npm run dev
npm run check
npm pack
```

Install the resulting `.tgz` in your own React + TypeScript app. Packing builds ESM/declarations and does not publish. React/React DOM are peers, never bundled. `npm run build` produces `dist/` for the library and `dist-playground/` for the demo. The independent tarball check installs outside this repository without aliases/symlinks, verifies types/public exports/SSR, then tests real DOM in dev StrictMode and production, including native forms, shared cache, resize and zero leaked resources. The photo is excluded from the library.

Open `/` for the single-engine forest/grid/upload Playground. It initially shows **Reference with an explicit example-only edge=0 override**. Click Reference or Reset to restore the historical values. Compare the four edge strengths, the six ablation cases, and Optical Balanced without changing scene position. `/components.html` is a DIY Hook example with native div/button/input; it initially opts into the Optical Balanced candidate. These are examples, not bundled UI components. The [manual review guide](docs/lg-c2-finalization.md) contains direct comparison links, static images and repeatable measurements.

SVG backdrop refraction targets Chromium; other engines get CSS fallback. Actual Safari/Firefox, autofill/password-manager and assistive-technology combinations remain unverified. CSP must allow `img-src data:` for maps, plus `blob:` for Playground uploads; CSP denial is not automatically detected. Existing folded-field, percentage/elliptical-radius and overlapping-filter limits remain. rAF intervals measured on one headless Chrome machine are not GPU utilization or a universal FPS guarantee.

MIT; adapted code retains the full [Hyalite MIT notice](licenses/Hyalite-MIT.txt). The local forest photo is owner-reported CC0, with original provenance still unverified; see [notices](THIRD_PARTY_NOTICES.md). No main merge, npm publication, Release or UI framework is part of LG-C2.
