# Liquid Glass

A Headless-first liquid-glass renderer: a framework-independent ESM core and one React 19 Hook. An independent [LibreCosta](https://github.com/librecosta) project.

Experimental, private, local tarball consumption only; no npm release. One package provides `@librecosta/liquid-glass`, `/react` and optional `/styles.css`. You own the DOM, appearance and native semantics. There are no public prebuilt card/button/input components.

```js
import {createLiquidGlass, QUALITY_PRESETS} from '@librecosta/liquid-glass';
import '@librecosta/liquid-glass/styles.css'; // optional, low-specificity effect rules
const element = document.querySelector('.my-surface');
element.classList.add('liquid-glass'); // your own radius, spacing, border, etc.
const glass = createLiquidGlass(element); // no options = Balanced
glass.setOptions(QUALITY_PRESETS.Fast); // dynamic, local update; no remount
glass.setOptions(QUALITY_PRESETS.Balanced); // restores all four quality parameters
glass.setOptions({rim: 0.5}); // any parameter can be overridden; core updates are patches
glass.refresh(); // after external stylesheet/ancestor geometry changes
// glass.destroy(); // idempotent cleanup when no longer needed
```

```tsx
import {useLiquidGlass} from '@librecosta/liquid-glass/react';
import '@librecosta/liquid-glass/styles.css';
function MyButton() {
  const {ref} = useLiquidGlass<HTMLButtonElement>(); // Balanced
  return <button ref={ref} className="liquid-glass" type="submit">Save</button>;
}
```

The Hook returns `ref` and `refresh`, accepts `enabled` independently of native `disabled`, and binds to your div, button, section, or decorative background layer. For inputs, put the Hook on an absolutely positioned, `pointer-events:none` background span; keep the real input transparent, above it, with its own native ref. See the [DIY example](src/components-demo.tsx) for controlled email, forms, focus and disabled behavior. No filter is applied to input text/caret. Navigation, dialogs and other layouts can use the same binding.

Public core exports are `createLiquidGlass`, `DEFAULTS`, `QUALITY_PRESETS`, `supported` and `LiquidGlass*` types. React exports only `useLiquidGlass` plus its types. The old global facade/watch/attach/setOpts machinery is internal, retained for regression tests, and not a package API. The unreleased prefab component exports have been removed.

Instances share maps and the hidden SVG host while options remain independent; duplicate ownership throws. Core `setOptions` merges patches; Hook `options` are a complete value, with omitted fields reset to defaults. Radius changes on bound DOM are observed; inherited changes during React commits are checked. Call `refresh()` for external ancestor/stylesheet changes. Materialize plays on binding, not updates. Destruction restores reserved `--hyalite`/`--hyalite-edge` values. SSR imports/rendering and development StrictMode are checked; binding is client-only. Optional CSS contains only effect rules, with no input layout, borders, radius, font or padding. Without it, consume those reserved variables in your own CSS; `self` mode also needs the appropriate `filter` styling/data attribute.

**No options means Balanced**, in core, Hook and Playground. These are parameter combinations for one renderer:

| | dispersion | sat | edge | rim |
| --- | ---: | ---: | ---: | ---: |
| Balanced — default | 0.8 | 1 | 0 | 0.80 |
| Fast — explicit performance choice | 0 | 1 | 0 | 0.80 |
| Reference — historical regression only | 1.6 | 0.86 | 0.32 | 1.76 |

Balanced keeps three chromatic displacement channels; Fast uses one and loses color separation. Neither applies the historical edge desaturation. Both have no CSS outline and a softer optical highlight. All other defaults remain unchanged. Reference pins the complete historical configuration independently of current defaults. Optical Balanced remains an explicitly labeled LG-C2 experiment (dispersion 1.6, sat 1, edge 0, rim 1.76), not another default. No optical algorithms, map resolution or quantization were changed.

For React switching, pass `options: QUALITY_PRESETS[quality]` to the same Hook, or `{...QUALITY_PRESETS[quality], rim: 0.5}` for an override; state/prop changes update the bound DOM without remounting. Omitting options again restores Balanced. See [LG-C3 defaults, regression checks and performance sample](docs/lg-c3-defaults.md); [LG-C2 measurements](docs/lg-c2-finalization.md) document the earlier configurations.

## Run and consume locally

Node 24+, npm, Chrome for browser checks (`LG_CHROME` selects an executable):

```sh
npm ci
npm run dev
npm run check
npm pack
```

Install the resulting `.tgz` in your own React + TypeScript app. Packing builds ESM/declarations and does not publish. React/React DOM are peers, never bundled. `npm run build` produces `dist/` for the library and `dist-playground/` for the demo. The independent tarball check installs outside this repository without aliases/symlinks, verifies types/public exports/SSR, then tests real DOM in dev StrictMode and production, including native forms, shared cache, resize and zero leaked resources. The photo is excluded from the library.

Open `/` for the single-engine forest/grid/upload Playground. First paint and Reset both use the actual **Balanced library defaults**, with no hidden example overrides. Switch Balanced/Fast without changing position or dimensions; Reference is labeled historical, and Optical Balanced is an experimental comparison. The controls show effective values including preset/individual overrides. `/components.html` is a native div/button/input Hook DIY example, also starting with Balanced. These are examples, not bundled UI components. The [review guide](docs/lg-c3-defaults.md) links the Playground and fixed images.

SVG backdrop refraction targets Chromium; other engines get CSS fallback. Actual Safari/Firefox, autofill/password-manager and assistive-technology combinations remain unverified. CSP must allow `img-src data:` for maps, plus `blob:` for Playground uploads; CSP denial is not automatically detected. Existing folded-field, percentage/elliptical-radius and overlapping-filter limits remain. rAF intervals measured on one headless Chrome machine are not GPU utilization or a universal FPS guarantee.

MIT; adapted code retains the full [Hyalite MIT notice](licenses/Hyalite-MIT.txt). The local forest photo is owner-reported CC0, with original provenance still unverified; see [notices](THIRD_PARTY_NOTICES.md). No main merge, npm publication, Release or UI framework is part of LG-C3.
