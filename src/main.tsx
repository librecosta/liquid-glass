declare global {
  interface Window {
    __engine: typeof api;
    __scene: Scene;
    __configure: (patch: Partial<Scene>) => void;
    __ready: boolean;
  }
}
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULTS, type HyaliteOptions } from "./core/index.ts";
import { initialScene, type Scene } from "./scene.ts";
import { SceneView } from "./scene-view.tsx";
import { QUALITY_PRESETS, QUALITY_NOTES } from "./quality.ts";
import api from "./core/index.ts";
import "./style.css";

const sliders = [
  ["bevel", "斜面", 1, 120, 1],
  ["thickness", "厚度", 0, 200, 1],
  ["slope", "斜率", 0.2, 4, 0.05],
  ["shade", "边缘暗部", 0, 2, 0.01],
  ["rim", "边缘反光", 0, 4, 0.01],
  ["blur", "模糊", 0, 12, 0.1],
  ["dispersion", "色散", 0, 8, 0.1],
  ["light", "光线角度", -180, 180, 1],
  ["edgeW", "光带宽度", 0.5, 32, 0.5],
  ["sat", "边缘饱和度", 0, 3, 0.01],
  ["edge", "外轮廓", 0, 2, 0.01],
  ["smooth", "平滑", 0, 4, 0.1],
  ["settle", "Resize 等待 / ms", 0, 800, 20],
  ["materialize", "材质化 / ms", 0, 2000, 50],
] as const;

function App() {
  const [scene, setScene] = useState<Scene>(() => {
    const quality = new URLSearchParams(location.search).get("quality");
    return {
      ...initialScene,
      quality:
        quality === "Balanced" || quality === "Fast" ? quality : "Reference",
    };
  });
  const [environment, setEnvironment] = useState("");
  const imageUrl = useRef("");
  useEffect(() => {
    setEnvironment(
      `${navigator.userAgent.match(/(?:Chrome|Edg)\/[\d.]+/)?.[0] ?? navigator.userAgent} / DPR ${devicePixelRatio}`,
    );
    window.__engine = api;
    window.__configure = (patch) => setScene((s) => ({ ...s, ...patch }));
    return () => {
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    };
  }, []);
  const change = (patch: Partial<Scene>) =>
    setScene((s) => {
      const next = { ...s, ...patch };
      next.x = Math.max(0, Math.min(500 - next.width, next.x));
      next.y = Math.max(0, Math.min(480 - next.height, next.y));
      return next;
    });
  const option = (patch: HyaliteOptions) =>
    setScene((s) => ({ ...s, opts: { ...s.opts, ...patch } }));
  const position = (x: number, y: number) => setScene((s) => ({ ...s, x, y }));
  if (new URLSearchParams(location.search).has("fixture"))
    return <SceneView scene={scene} onPosition={position} />;
  return (
    <main>
      <header>
        <div>
          <h1>Liquid Glass</h1>
          <p>单引擎折射实验 / Reference 默认画质</p>
        </div>
        <a href="/components.html">React API 示例 ↗</a>
      </header>
      <div className="workspace">
        <section className="comparison" aria-label="LibreCosta Playground">
          <div className="toolbar">
            <div className="segments" aria-label="画质">
              {Object.keys(QUALITY_PRESETS).map((q) => (
                <button
                  key={q}
                  aria-pressed={scene.quality === q}
                  onClick={() =>
                    change({ quality: q as Scene["quality"], opts: {} })
                  }
                >
                  {q}
                  {q === "Reference" ? "" : "（实验）"}
                </button>
              ))}
            </div>
          </div>
          <p className="quality-note">
            {QUALITY_NOTES[scene.quality]} 切换档位会清除参数覆盖。
          </p>
          <div className="scene-viewport">
            <SceneView scene={scene} onPosition={position} />
          </div>
          <div className="footnote">
            <span>
              鼠标或触摸拖动；聚焦拖动柄后可用方向键移动。场景 500 × 480。
            </span>
            <span>{environment}</span>
          </div>
        </section>
        <aside aria-label="实验参数">
          <div className="controls-heading">
            <h2>实验参数</h2>
            <button
              onClick={() => {
                change({ ...initialScene, revision: scene.revision + 1 });
              }}
            >
              重置
            </button>
          </div>
          <label>
            背景
            <select
              value={scene.background}
              onChange={(e) =>
                change({ background: e.target.value as Scene["background"] })
              }
            >
              <option value="forest">森林（本地）</option>
              <option value="grid">网格</option>
              <option value="image">本地图片</option>
            </select>
          </label>
          {scene.background === "image" && (
            <label className="upload">
              选择本地图片
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
                  imageUrl.current = URL.createObjectURL(file);
                  change({ image: imageUrl.current });
                }}
              />
              <small>仅在当前浏览器内使用</small>
            </label>
          )}
          <label>
            实例数
            <select
              aria-label="实例数"
              value={scene.instances}
              onChange={(e) => change({ instances: +e.target.value })}
            >
              {[1, 5, 20].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            样例
            <select
              value={scene.sample}
              onChange={(e) =>
                change({ sample: e.target.value as Scene["sample"] })
              }
            >
              <option value="card">单卡</option>
              <option value="controls">原生 button / input</option>
            </select>
          </label>
          <label>
            几何
            <select
              value={scene.radius}
              onChange={(e) =>
                change(
                  e.target.value === "50%"
                    ? { radius: "50%", width: 220, height: 220 }
                    : { radius: e.target.value },
                )
              }
            >
              <option value="42px">圆角 42px</option>
              <option value="50%">圆形 / 胶囊 50%</option>
              <option value="48px 12px 64px 4px">非对称圆角</option>
              <option value="24px 24px 0 0">上圆角 24px</option>
              <option value="30px / 50px">椭圆圆角</option>
            </select>
          </label>
          {(["width", "height"] as const).map((k) => (
            <label key={k}>
              {k === "width" ? "宽度" : "高度"}
              <output>{scene[k]} px</output>
              <input
                aria-label={k === "width" ? "宽度" : "高度"}
                type="range"
                min={k === "width" ? 160 : 80}
                max={k === "width" ? 420 : 320}
                value={scene[k]}
                onChange={(e) => change({ [k]: +e.target.value })}
              />
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={scene.fallback}
              onChange={(e) => change({ fallback: e.target.checked })}
            />
            模拟不支持 SVG 折射
          </label>
          <label>
            斜面截面
            <select
              value={scene.opts.shape ?? DEFAULTS.shape}
              onChange={(e) =>
                option({ shape: e.target.value as HyaliteOptions["shape"] })
              }
            >
              {["squircle", "circle", "lip"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="sliders">
            {sliders.map(([key, label, min, max, step]) => (
              <label key={key}>
                {label}
                <output>
                  {scene.opts[key] ??
                    { ...DEFAULTS, ...QUALITY_PRESETS[scene.quality] }[key]}
                </output>
                <input
                  aria-label={label}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={
                    scene.opts[key] ??
                    { ...DEFAULTS, ...QUALITY_PRESETS[scene.quality] }[key]
                  }
                  onChange={(e) => option({ [key]: +e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={scene.opts.self ?? false}
              onChange={(e) => option({ self: e.target.checked })}
            />
            Self 模式（只位移自身）
          </label>
          <button
            className="replay"
            onClick={() => change({ revision: scene.revision + 1 })}
          >
            重新挂载 / 播放材质化
          </button>
          <p className="hint">
            平滑仅在斜率 ≤ 1
            时生效。材质化在重新挂载时播放；系统减少动态效果设置会关闭动画。
          </p>
        </aside>
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
