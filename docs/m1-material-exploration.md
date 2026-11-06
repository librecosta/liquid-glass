# M1 — Material exploration

Visual candidates for owner review, based on dev `ae253a5` / published v0.1.0. No new public API, package entry or release. Material is application CSS; Quality remains an independent engine choice.

| Material | Application skin | Optical parameters |
| --- | --- | --- |
| Clear | Existing v0.1.0 demo background, without additional decoration | Unchanged |
| Soft (candidate) | 12% environmental tint on dark scenes / 10% on daylight, shallow shadow and a very soft inner light | Unchanged |
| Prismatic (candidate) | Neutral, localized gloss and shallow depth; no fixed neon colors | Unchanged |

Skins are scoped to the public Playground. Decorative pseudo-elements have `pointer-events:none`; the existing engine owns `backdrop-filter`. No wallpaper brightness sampling, new image assets, render engine or library components are introduced. The Hook DIY page and historical fixture keep their existing presentation.

## Local review / 本地审查

```sh
npm ci
npm run dev -- --port 5173
```

Open these URLs and use the Material buttons without changing Quality:

- [Clear / daylight](http://127.0.0.1:5173/?lang=en&quality=Balanced&material=clear&background=light)
- [Soft / daylight](http://127.0.0.1:5173/?lang=en&quality=Balanced&material=soft&background=light)
- [Prismatic / daylight](http://127.0.0.1:5173/?lang=en&quality=Balanced&material=prismatic&background=light)
- [中文 / 深色对照](http://127.0.0.1:5173/?lang=zh-CN&quality=Balanced&material=soft&background=dark)
- [Prismatic / precision grid](http://127.0.0.1:5173/?lang=en&quality=Balanced&material=prismatic&background=grid)

Change Background to daylight, night, grid, forest or a local upload. Choose Native controls to try text selection, focus, clicking and disabled buttons. Advanced optics contains the CSS fallback preview. Reset restores Clear + Balanced, the original forest and geometry defaults. Material, named Quality, language and built-in background are shareable; custom optical edits and uploaded blobs are local to the current page.

中文：先保持 Balanced，依次切换 Clear（清透）、Soft（柔光）、Prismatic（棱彩），再更换柔和日光、深夜色调或精确网格。光学几何保留斜面／厚度／磨砂调节。原生控件模式可检查输入、选择、按钮禁用及拖动。材质只改视觉皮肤，不修改当前光学参数。

## Matched CSS-only comparison

Actual Chrome 156.0.8078.80 rendering on Windows. Every column uses the same 1440 × 1000 viewport, DPR 1, 1010 × 618 scene, centered 400 × 280 glass, 42px radius, English content, installed Aptos/Segoe UI fonts, position and Balanced optics with no overrides. Each image crops the same 600 × 420 scene region. No rotation or post-processing changes the material. Contact sheets are JPEG quality 90; lossless individual captures and metadata are generated under ignored `performance-results/m1/`.

![Daylight: Clear, Soft and Prismatic with identical Balanced optics](m1/light.jpg)

![Night: Clear, Soft and Prismatic with identical Balanced optics](m1/dark.jpg)

![Grid: Clear, Soft and Prismatic with identical Balanced optics](m1/grid.jpg)

The differences are deliberately restrained. Soft adds tint rather than a white fog; Prismatic emphasizes local surface gloss. Color separation still depends on the backdrop and the selected optics; the CSS skin alone does not increase dispersion. Smooth gradients reveal less refraction than the grid. These are candidates, not approved final presets.

## Separate optical experiment

Advanced optics → **Try recommended optics (experiment)** explicitly overlays bevel 42, dispersion 1.4, rim 1.2 and edge 0. It never changes the selected Quality or saved `scene.opts`; switching it off restores the previous options, including custom values. Material changes do not toggle this experiment. Editing optics or choosing Quality ends it. A status message and the inspector show the effective overrides. It is off on first load/Reset and is never enabled by a shared URL.

中文：强化光学必须在“高级光学”中显式开启，不能用右侧效果替代上面的纯 CSS 材质比较。关闭即恢复之前的配置；在试用时所选画质名称不变，但实际光学参数已被临时覆盖，包括 Fast 的色散，因此界面会明确提示。

![Same Prismatic skin: Balanced optics versus the explicitly enabled optical trial](m1/optical-trial.jpg)

## Verification and reproduction

```sh
npm run check
# With the local dev server running:
node scripts/capture-materials.mjs
```

The optional `--compare-baseline` capture flag requires clean v0.1.0 scene captures under `performance-results/m1-baseline/{grid,forest}.png`, produced at the identical viewport/DPR/fonts. It does not regenerate or alter historical golden files.

- Clear's public grid and forest scenes compared with clean v0.1.0 source `b157017`: **0 changed pixels** at the matched viewport.
- Material changes preserve the same `scene.opts` object, selected Quality, DOM elements, filter nodes and SVG contents at Balanced/Fast/Reference; **0 new maps / 0 PNG encodes**.
- Five new browser checks cover independent skins, URL/default/Reset, reversible optical trial, bilingual mobile native controls/drag/upload/fallback and fixture isolation.
- Existing layout checks exercise both pages/languages at 390/768/1440/1920px, including all expanded property groups.
- The full check includes Node contracts, TypeScript/builds, historical exact Windows pixels, portable map/SVG contracts, independent tarball types/SSR/StrictMode/production and both static URL bases.

Result on 2026-11-06: **`npm run check` passed** — 4 Node tests, 35 browser tests (including unchanged exact Reference and Balanced/Fast goldens), the 17-file external tarball consumer and root + `/liquid-glass/` production-path verification. Package/lock version, core/Hook/public CSS, Quality presets and all historical goldens are unchanged. The four comparison sheets total about 371 KiB.

Non-Chromium coverage uses forced fallback and browser-detection tests; physical Safari/Firefox/touch-device review remains outstanding. Arbitrary uploaded photos retain their original pixels and the demo's existing white text treatment, so their contrast still needs manual review. Public M1 screenshots use only CSS-generated backgrounds; no new forest derivatives are committed. No public Pages deployment.

**Awaiting owner visual review / 等待所有者视觉审查。** No main merge, npm version change, publication, tag, Release or M2 work is authorized by M1.
