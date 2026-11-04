# Liquid Glass

Liquid glass refraction with a framework-independent ESM core and four React 19 APIs.

An independent [LibreCosta](https://github.com/librecosta) project.

## Status

**LG-C experimental, local consumption only.** The package is private and has not been published to npm. Node 24+, npm and a React 19 + TypeScript app are the current validation targets.

[LG-A](docs/lg-a-baseline.md) established the faithful Hyalite v0.5.0 port; [LG-B](docs/lg-b-validation.md) added independent instances and React/ESM consumption. [LG-C](docs/lg-c-performance.md) removes the upstream runtime and dual iframes, uses a local forest background and measures startup, dragging, resize and 1/5/20 instances. Reference keeps the accepted optical defaults and Chrome pixels. Balanced and Fast are explicitly lossy experiments; Reference remains the default.

## Local consumption

Run `npm ci` and `npm pack` in this repository, then `npm install /path/to/librecosta-liquid-glass-0.0.0.tgz` in your app. `npm pack` builds the ESM library and declarations; it does not publish anything. React/React DOM are peers, not bundled dependencies. CSS is explicit and can be overridden by application styles.

```tsx
import { LiquidGlass, LiquidGlassButton, LiquidGlassInput } from '@librecosta/liquid-glass/react';
import '@librecosta/liquid-glass/styles.css';

<LiquidGlass options={{ bevel: 37 }} className="custom-card">Hello</LiquidGlass>
<LiquidGlassButton type="submit" disabled={false}>Continue</LiquidGlassButton>
<LiquidGlassInput name="email" type="email" placeholder="Email" required
  wrapperStyle={{ borderRadius: 16 }} />
```

Native attributes, events and refs reach the underlying elements. Input `className`/`style`/ref apply to the real input; `wrapperClassName`/`wrapperStyle` configure its glass background geometry/layout. Controlled and uncontrolled inputs work. `disabled` is native behavior; `enabled={false}` turns off the effect. No card radius, padding, typography or brand appearance is imposed.

```tsx
import { useLiquidGlass } from '@librecosta/liquid-glass/react';

function CustomCard() {
  const { ref, refresh } = useLiquidGlass<HTMLElement>({ options: { thickness: 59 } });
  return <section ref={ref} className="liquid-glass" onTransitionEnd={refresh}>Custom DOM</section>;
}
```

The hook uses the same core and opt-in CSS. Element class/style radius changes and inherited radius changes during React commits are detected. Use `refresh()` after changes to an ancestor or external stylesheet outside React. Size updates use the original ResizeObserver rules.

```ts
import { createLiquidGlass } from '@librecosta/liquid-glass';
// Client-side, after the element exists; apply class="liquid-glass" and import styles.css.
const glass = createLiquidGlass(element, { bevel: 37 });
glass.setOptions({ thickness: 45 }); // local synchronous patch; no remount/ramp
glass.refresh();
glass.destroy(); // idempotent
```

One owner per element; a duplicate binding throws. Instances share map/filter caches and a hidden SVG host. Updating or destroying one leaves others intact. The legacy Hyalite API is a compatibility facade over the same TS engine; its global `setOpts` affects legacy attachments only. React `options` are a complete prop value (omitted fields reset to defaults); instance `setOptions` merges a patch. Materialize plays only on binding. Reserved `--hyalite`/`--hyalite-edge` properties are restored on instance destruction. Imports and React server rendering are SSR-safe; actual binding is client-only.

Optional `QUALITY_PRESETS` and `LiquidGlassQuality` are exported from the core entry. Pass a preset as ordinary instance/React options to opt in. Balanced uses dispersion 0.8 and `sat=1`; Fast uses dispersion 0 and `sat=1`, losing chromatic separation. Both skip edge desaturation. Neither changes SDF, map resolution or quantization. See the measured comparison and images in [LG-C](docs/lg-c-performance.md).

## Run and verify

Chrome is required for browser checks (`LG_CHROME` can select an executable). No backend or external runtime services.

```sh
npm ci
npm run dev
npm run check
```

Open `/` for the single-engine playground and `/components.html` for the actual React APIs. Both default to Reference over the local forest photo. The playground also supports a precise grid and local image uploads. Move the card by dragging or focusing its handle and using arrow keys. Quality switching clears parameter overrides; reset restores Reference.

`npm run build` produces `dist/` (library) and `dist-playground/` (demo). `npm test` runs frozen math/default and SSR contracts; `npm run test:browser` verifies LibreCosta Reference gold, dragging, cache/lifecycle and fallback. `npm run test:consumer` installs a tarball into a separate temporary React + Vite + strict TS project and verifies SSR, dev StrictMode and production rendering. Run `npm run build:lib` before an isolated consumer check. Test artifacts are in ignored `test-results/`; performance traces are in ignored `performance-results/`. The external project is retained at its printed temporary path. Its first dependency installation requires the npm registry. Performance commands, environment and reviewed data are in [LG-C](docs/lg-c-performance.md).

## Support

SVG backdrop refraction targets Chromium. Other engines receive CSS blur/edge fallback; actual Safari/Firefox rendering has not been validated. A strict CSP must allow `img-src data:` for displacement maps (and `blob:` if the playground uses local pictures). The original percentage/elliptical-radius rules and folded-field limitations remain unchanged. Input background and text are separate layers; standard native keyboard, focus, selection and forms are retained. Autofill attributes are forwarded; password-manager/autofill UI and assistive-technology combinations have not been exhaustively tested. `self` displaces the bound element itself; on an empty input background it has no foreground to displace.

Reference still has Chromium SVG compositing costs, especially at high DPR or with overlapping glass. Frame timing in one machine's headless Chrome is not a universal FPS guarantee or GPU utilization measurement. No new renderer, optical algorithm optimization, npm publication or large UI library was added.

## License

MIT; adapted portions retain the notices described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
The demo forest photo is owner-reported CC0, with the original photo page still unverified; [provenance](src/assets/forest.provenance.json) records that limit. It is bundled only with the playground, never the library.
