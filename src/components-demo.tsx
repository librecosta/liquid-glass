import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LiquidGlass,
  LiquidGlassButton,
  LiquidGlassInput,
  useLiquidGlass,
} from "./react/index.js";
import "./styles.css";
import "./components-demo.css";
import {
  QUALITY_PRESETS,
  QUALITY_NOTES,
  type LiquidGlassQuality,
} from "./quality.ts";

function Demo() {
  const [quality, setQuality] = useState<LiquidGlassQuality>("Reference");
  const options = QUALITY_PRESETS[quality];
  const [bevel, setBevel] = useState(37);
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const custom = useLiquidGlass<HTMLElement>({
    options: { ...options, bevel: 20, thickness: 35 },
    enabled,
  });
  return (
    <main className="component-demo">
      <header>
        <h1>React API</h1>
        <a href="/">Playground ↗</a>
      </header>
      <p>
        四个 API，共享贴图缓存。更新左侧参数不影响右侧；外观由示例 CSS 提供。
      </p>
      <label>
        画质{" "}
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as LiquidGlassQuality)}
        >
          {Object.keys(QUALITY_PRESETS).map((q) => (
            <option key={q} value={q}>
              {q}
              {q === "Reference" ? "" : "（实验）"}
            </option>
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
      <div className="demo-scene">
        <LiquidGlass
          className="demo-card"
          options={{ ...options, bevel }}
          enabled={enabled}
        >
          <h2>独立配置</h2>
          <p>左侧斜面 {bevel}px</p>
        </LiquidGlass>
        <LiquidGlass className="demo-card" options={options} enabled={enabled}>
          <h2>默认参数</h2>
          <p>斜面始终为 37px</p>
        </LiquidGlass>
        <section ref={custom.ref} className="liquid-glass demo-card">
          <h2>自定义 DOM / Hook</h2>
          <button onClick={custom.refresh}>刷新几何</button>
        </section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(new FormData(e.currentTarget).get("email") as string);
          }}
        >
          <label htmlFor="email">邮箱（原生输入）</label>
          <LiquidGlassInput
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
            ref={input}
            enabled={enabled}
            options={options}
            wrapperClassName="demo-input"
          />
          <LiquidGlassButton
            type="submit"
            className="demo-button"
            enabled={enabled}
            options={options}
          >
            提交
          </LiquidGlassButton>
          <LiquidGlassButton
            type="button"
            disabled
            className="demo-button"
            enabled={enabled}
            options={options}
          >
            Disabled
          </LiquidGlassButton>
          <button type="button" onClick={() => input.current?.focus()}>
            聚焦输入框
          </button>
        </form>
      </div>
      <output aria-live="polite">{submitted && `已提交：${submitted}`}</output>
      <p>
        Chromium 提供 SVG 折射，其余环境使用 CSS
        回退。组件未预设圆角、间距或品牌配色。
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
