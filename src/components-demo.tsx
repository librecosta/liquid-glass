import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useLiquidGlass } from "./react/index.js";
import { QUALITY_PRESETS, type LiquidGlassQuality } from "./quality.ts";
import { useLanguage, qualityKeys, qualityNotes } from "./i18n.ts";
import { RangeField, SiteFooter, SiteHeader, Switch } from "./site-ui.tsx";
import "./styles.css";
import "./style.css";
import "./components-demo.css";

function Demo() {
  const { language, setLanguage, t } = useLanguage("examplesTitle");
  const [quality, setQuality] = useState<LiquidGlassQuality>(() => {
    const query = new URLSearchParams(location.search).get("quality");
    return query && Object.hasOwn(QUALITY_PRESETS, query)
      ? (query as LiquidGlassQuality)
      : "Balanced";
  });
  const [bevel, setBevel] = useState(37),
    [enabled, setEnabled] = useState(true),
    [disabled, setDisabled] = useState(false);
  const [text, setText] = useState(""),
    [submitted, setSubmitted] = useState<string | null>(null),
    [clicks, setClicks] = useState(0);
  const options = QUALITY_PRESETS[quality];
  const input = useRef<HTMLInputElement>(null);
  const left = useLiquidGlass<HTMLDivElement>({
    options: { ...options, bevel },
    enabled,
  });
  const right = useLiquidGlass<HTMLDivElement>({ options, enabled });
  const custom = useLiquidGlass<HTMLElement>({
    options: { ...options, bevel: 20, thickness: 35 },
    enabled,
  });
  const surface = useLiquidGlass<HTMLSpanElement>({ options, enabled });
  const submit = useLiquidGlass<HTMLButtonElement>({ options, enabled });
  const action = useLiquidGlass<HTMLButtonElement>({ options, enabled });
  useEffect(() => {
    if (input.current?.validity.customError)
      input.current.setCustomValidity(t("invalidEmail"));
  }, [language]);
  return (
    <div className="site">
      <SiteHeader
        language={language}
        setLanguage={setLanguage}
        t={t}
        page="examples"
      />
      <main id="content" className="site-main" tabIndex={-1}>
        <div className="page-intro">
          <div>
            <h1>{t("examplesHeading")}</h1>
            <p>{t("examplesIntro")}</p>
          </div>
        </div>
        <div className="workspace">
          <section className="preview-column" aria-label={t("demoStage")}>
            <div className="demo-scene">
              <div ref={left.ref} className="liquid-glass demo-card">
                <span className="demo-tag">HTMLDivElement</span>
                <h2>{t("ownDiv")}</h2>
                <p>
                  {t("leftBevel")}: {bevel}px
                </p>
              </div>
              <div ref={right.ref} className="liquid-glass demo-card">
                <span className="demo-tag">HTMLDivElement</span>
                <h2>{t("independent")}</h2>
                <p>{t("independentNote")}</p>
              </div>
              <section ref={custom.ref} className="liquid-glass demo-card">
                <span className="demo-tag">HTMLElement</span>
                <h2>{t("ownSection")}</h2>
                <p>{t("sectionNote")}</p>
                <button className="demo-refresh" onClick={custom.refresh}>
                  {t("refresh")}
                </button>
              </section>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(
                    new FormData(e.currentTarget).get("email") as string,
                  );
                }}
              >
                <label className="demo-email-label" htmlFor="email">
                  {t("email")}
                </label>
                <span className="demo-input">
                  <span
                    ref={surface.ref}
                    className="liquid-glass demo-input-surface"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t("emailPlaceholder")}
                    value={text}
                    ref={input}
                    onInvalid={(e) =>
                      e.currentTarget.setCustomValidity(t("invalidEmail"))
                    }
                    onChange={(e) => {
                      e.currentTarget.setCustomValidity("");
                      setText(e.target.value);
                    }}
                  />
                </span>
                <div className="demo-form-actions">
                  <button
                    ref={submit.ref}
                    className="liquid-glass demo-button"
                    type="submit"
                    disabled={disabled}
                  >
                    {t("submit")}
                  </button>
                  <button
                    ref={action.ref}
                    className="liquid-glass demo-button"
                    type="button"
                    disabled={disabled}
                    onClick={() => setClicks((n) => n + 1)}
                  >
                    {t("action", { count: clicks })}
                  </button>
                  <button
                    className="demo-focus"
                    type="button"
                    onClick={() => input.current?.focus()}
                  >
                    {t("focusInput")}
                  </button>
                </div>
              </form>
            </div>
            <output className="demo-feedback" aria-live="polite">
              {submitted !== null
                ? t("submitted", { value: submitted })
                : t("formReady")}
            </output>
            <p className="stage-caption">{t("inputHint")}</p>
          </section>
          <aside className="properties" aria-label={t("properties")}>
            <div className="properties-heading">
              <h2>{t("properties")}</h2>
            </div>
            <label className="select-field">
              {t("quality")}
              <select
                value={quality}
                onChange={(e) =>
                  setQuality(e.target.value as LiquidGlassQuality)
                }
              >
                {Object.keys(QUALITY_PRESETS).map((q) => (
                  <option key={q} value={q}>
                    {t(qualityKeys[q as LiquidGlassQuality])}
                  </option>
                ))}
              </select>
            </label>
            <p className="quality-note">{t(qualityNotes[quality])}</p>
            <RangeField
              label={t("leftBevel")}
              min={1}
              max={90}
              value={bevel}
              onChange={setBevel}
              t={t}
              unit="px"
            />
            <Switch
              label={t("effectEnabled")}
              checked={enabled}
              onChange={setEnabled}
            />
            <Switch
              label={t("disableButtons")}
              checked={disabled}
              onChange={setDisabled}
            />
            <p className="field-hint demo-property-hint">{t("hookCodeHint")}</p>
          </aside>
          <section className="code-section code-panel">
            <h2>{t("hookCodeTitle")}</h2>
            <p>{t("hookCodeHint")}</p>
            <pre tabIndex={0}>
              <code>{`const { ref } = useLiquidGlass<HTMLButtonElement>({\n  options: QUALITY_PRESETS${quality === "Optical Balanced" ? '["Optical Balanced"]' : `.${quality}`},\n  enabled,\n});\n\nreturn <button ref={ref} className="my-glass" disabled={disabled}>\n  ${t("submit")}\n</button>;`}</code>
            </pre>
          </section>
        </div>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
