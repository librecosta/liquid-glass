import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Language, Translator } from "./i18n.ts";
import { qualityKeys } from "./i18n.ts";
import type { LiquidGlassQuality } from "./quality.ts";

export function SiteHeader({
  language,
  setLanguage,
  t,
  page,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translator;
  page: "playground" | "examples";
}) {
  const [feedback, setFeedback] = useState<"copied" | "copyError" | null>(null);
  return (
    <>
      <a className="skip-link" href="#content">
        {t("skip")}
      </a>
      <header className="site-header">
        <a
          className="brand"
          href={`${import.meta.env.BASE_URL}?lang=${language}`}
          aria-label={t("brandHome")}
        >
          <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect
              x="4"
              y="9"
              width="23"
              height="23"
              rx="8"
              stroke="currentColor"
            />
            <rect
              x="11"
              y="3"
              width="21"
              height="23"
              rx="8"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
          <span>Liquid Glass</span>
        </a>
        <nav aria-label={t("navigation")}>
          <a
            href={`${import.meta.env.BASE_URL}?lang=${language}`}
            aria-current={page === "playground" ? "page" : undefined}
          >
            {t("playground")}
          </a>
          <a
            href={`${import.meta.env.BASE_URL}components.html?lang=${language}`}
            aria-current={page === "examples" ? "page" : undefined}
          >
            {t("examples")}
          </a>
          <a href="https://github.com/librecosta/liquid-glass">
            {t("github")} <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <div className="header-actions">
          <label className="language-picker">
            <span className="sr-only">{t("language")}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en" lang="en">
                English
              </option>
              <option value="zh-CN" lang="zh-CN">
                简体中文
              </option>
            </select>
          </label>
          <button
            className="quiet-button share-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(location.href);
                setFeedback("copied");
              } catch {
                setFeedback("copyError");
              }
            }}
          >
            {t("share")}
          </button>
        </div>
        <span className="share-feedback" role="status">
          {feedback && t(feedback)}
        </span>
      </header>
    </>
  );
}
export function SiteFooter({ t }: { t: Translator }) {
  return (
    <footer className="site-footer">
      <p>{t("footer")}</p>
      <a href="https://github.com/librecosta/liquid-glass/blob/dev/LICENSE">
        {t("license")}
      </a>
    </footer>
  );
}
export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  hint,
  t,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  hint?: string;
  t: Translator;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const update = (n: number) => {
    if (Number.isFinite(n))
      onChange(Math.round(Math.max(min, Math.min(max, n)) * 1e6) / 1e6);
  };
  const commit = (input: HTMLInputElement) => {
    const n = input.valueAsNumber;
    const next = Number.isFinite(n)
      ? Math.round(Math.max(min, Math.min(max, n)) * 1e6) / 1e6
      : value;
    setDraft(String(next));
    onChange(next);
  };
  return (
    <div className="range-field">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        <span className="number-wrap">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft}
            aria-label={`${label} (${t("value")})`}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => {
              const input = e.currentTarget,
                n = input.valueAsNumber;
              setDraft(input.value);
              // Preserve incomplete/out-of-range typing; clamp on blur or Enter.
              if (Number.isFinite(n) && n >= min && n <= max) update(n);
            }}
            onBlur={(e) => commit(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget);
            }}
          />
          {unit && <span>{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        style={
          {
            "--fill": `${((value - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
        onChange={(e) => update(e.currentTarget.valueAsNumber)}
      />
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </label>
  );
}
export function ControlGroup({
  title,
  children,
  initialOpen = false,
}: {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details
      className="control-group"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <span className="group-toggle" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </summary>
      <div className="group-content">{children}</div>
    </details>
  );
}
export function QualityPicker({
  quality,
  onChange,
  t,
}: {
  quality: LiquidGlassQuality;
  onChange: (quality: LiquidGlassQuality) => void;
  t: Translator;
}) {
  return (
    <div className="quality-segments" role="group" aria-label={t("quality")}>
      {(["Balanced", "Fast", "Reference"] as const).map((q) => (
        <button
          key={q}
          aria-pressed={quality === q}
          onClick={() => onChange(q)}
        >
          {t(qualityKeys[q])}
          {q === "Balanced" && (
            <span className="default-badge">{t("defaultBadge")}</span>
          )}
        </button>
      ))}
    </div>
  );
}
