# Changelog

Versions below describe release source. Registry availability and GitHub Releases are confirmed separately; see the [v0.1.1 checklist](docs/v0.1.1-release-checklist.md).

## 0.1.1

- Add optional `@librecosta/liquid-glass/materials.css`: Clear, Soft (7% tint; explicit light theme 6%) and neutral Prismatic skins.
- Keep material/theme selection in application-owned attributes, independent of optical Quality. `data-lg-decorate` explicitly reserves an unused `::after`; native inputs use a separate decorative surface.
- Share one material stylesheet between the package and Playground. Existing core, React Hook, base `styles.css`, Balanced/Fast/Reference and optical defaults remain unchanged.
- Add the Windows development command `npm run dev:stop`, with verified checkout/process ownership for Vite dev and preview services.

## 0.1.0 — 2026-11-05

- Headless SVG refraction through a native TypeScript ESM core. Bind your own HTML and optional effect CSS.
- One React 19 Hook, `useLiquidGlass`, for user-owned divs, buttons and decorative input layers.
- Balanced defaults and explicit Fast switching on the same instance; historical Reference remains available.
- Independent configuration, shared caches, resize handling, live updates and explicit lifecycle cleanup.
- SSR-safe imports, Chromium refraction and CSS blur fallback for other engines.

Install with `npm install @librecosta/liquid-glass@0.1.0`. See the [release notes](https://github.com/librecosta/liquid-glass/releases/tag/v0.1.0) and [verification checklist](docs/v0.1.0-release-checklist.md).
