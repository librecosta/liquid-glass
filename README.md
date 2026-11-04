# Liquid Glass

SVG refraction experiments with a framework-independent TypeScript ESM core and a React + Vite comparison playground.

An independent [LibreCosta](https://github.com/librecosta) project.

## Status

**LG-A experimental baseline.** Not a production component library or published npm package.

[Issue #1](https://github.com/librecosta/liquid-glass/issues/1) freezes Hyalite v0.5.0 and ports its behavior without optical or performance changes. The playground compares both engines with synchronized geometry, dragging, parameters, striped/grid/local-image backgrounds, native button/input samples, materialize and CSS fallback.

## Run and verify

Node 24+ and npm; Chrome for the browser checks. No backend or external runtime services.

```sh
npm ci
npm run dev
npm run check
```

Open the local Vite URL. `npm test` runs Node contracts; `npm run build` checks types and builds; `npm run test:browser` runs both upstream case suites, pixel comparisons, lifecycle/control checks and initial measurements. Set `LG_CHROME` to a Chromium executable path if Chrome is not in its standard location. Generated screenshots and JSON reports go to ignored `test-results/baseline/`.

The frozen original also runs independently: serve `reference/hyalite-v0.5.0/` as static files and open `demo/index.html` or `demo/cases.html`. Its unmodified runner accepts `node reference/hyalite-v0.5.0/demo/run-cases.mjs --browser <chrome-path>`.

See [baseline results and known limitations](docs/lg-a-baseline.md). Instance isolation, production React components/hooks, optimization and npm publication remain later milestones.

## License

MIT; adapted portions retain the notices described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
