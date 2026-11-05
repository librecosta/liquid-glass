import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useLiquidGlass } from "./react/index.js";
import {
  QUALITY_PRESETS,
  QUALITY_NOTES,
  QUALITY_LABELS,
  type LiquidGlassQuality,
} from "./quality.ts";
import "./styles.css";
import "./components-demo.css";

function Demo() {
  const [quality, setQuality] =
    useState<LiquidGlassQuality>("Balanced");
  const options = QUALITY_PRESETS[quality];
  const [bevel, setBevel] = useState(37),
    [enabled, setEnabled] = useState(true),
    [disabled, setDisabled] = useState(false);
  const [text, setText] = useState(""),
    [submitted, setSubmitted] = useState(""),
    [clicks, setClicks] = useState(0);
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
  return (
    <main className="component-demo">
      <header>
        <h1>React Hook / DIY DOM</h1>
        <a href="/">Playground ↗</a>
      </header>
      <p>
        以下 div、section、button、input 均由示例自己创建，只有绑定玻璃的
        useLiquidGlass Hook 来自库。外观和布局可自由覆盖。
      </p>
      <label>
        画质{" "}
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as LiquidGlassQuality)}
        >
          {Object.keys(QUALITY_PRESETS).map((q) => (
            <option key={q} value={q}>{QUALITY_LABELS[q as LiquidGlassQuality]}</option>
          ))}
        </select>
      </label>
      <p>{QUALITY_NOTES[quality]}</p>
      <label>
        左侧斜面 {bevel}px{" "}
        <input
          aria-label="左侧斜面"
          type="range"
          min="1"
          max="90"
          value={bevel}
          onChange={(e) => setBevel(+e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        启用特效（独立于 disabled）
      </label>
      <label>
        <input
          type="checkbox"
          checked={disabled}
          onChange={(e) => setDisabled(e.target.checked)}
        />
        禁用示例按钮
      </label>
      <div className="demo-scene">
        <div ref={left.ref} className="liquid-glass demo-card">
          <h2>自己的 div</h2>
          <p>左侧斜面 {bevel}px</p>
        </div>
        <div ref={right.ref} className="liquid-glass demo-card">
          <h2>独立实例</h2>
          <p>右侧斜面始终为 37px</p>
        </div>
        <section ref={custom.ref} className="liquid-glass demo-card">
          <h2>自己的 section</h2>
          <button onClick={custom.refresh}>刷新几何</button>
        </section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(new FormData(e.currentTarget).get("email") as string);
          }}
        >
          <label htmlFor="email">邮箱（原生输入）</label>
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
              required
              placeholder="you@example.com"
              value={text}
              onChange={(e) => setText(e.target.value)}
              ref={input}
            />
          </span>
          <button
            ref={submit.ref}
            className="liquid-glass demo-button"
            type="submit"
            disabled={disabled}
          >
            提交
          </button>
          <button
            ref={action.ref}
            className="liquid-glass demo-button"
            type="button"
            disabled={disabled}
            onClick={() => setClicks((n) => n + 1)}
          >
            原生点击 {clicks}
          </button>
          <button type="button" onClick={() => input.current?.focus()}>
            聚焦输入框
          </button>
        </form>
      </div>
      <output aria-live="polite">{submitted && `已提交：${submitted}`}</output>
      <p>
        输入框只有独立背景层应用折射；透明交互层保留清晰文字、光标、选择、焦点和表单行为。可用同样方式组合导航、弹窗等
        DOM。
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
