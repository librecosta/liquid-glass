import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULTS, type HyaliteOptions } from "./core/index.ts";
import { initialScene, type Scene } from "./scene.ts";
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
  const [scene, setScene] = useState<Scene>(initialScene);
  const [view, setView] = useState("both");
  const [environment, setEnvironment] = useState("正在检测浏览器…");
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  const imageUrl = useRef("");
  const current = useRef(scene);
  current.current = scene;
  const send = (frame: HTMLIFrameElement | null) =>
    frame?.contentWindow?.postMessage(
      { type: "scene", scene: current.current },
      location.origin,
    );
  useEffect(() => {
    frames.current.forEach(send);
  }, [scene]);
  useEffect(() => {
    setEnvironment(
      `${navigator.userAgent.match(/(?:Chrome|Edg)\/[\d.]+/)?.[0] ?? navigator.userAgent} / DPR ${devicePixelRatio}`,
    );
    const receive = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        !frames.current.some((f) => f?.contentWindow === e.source)
      )
        return;
      if (e.data?.type === "drag")
        setScene((s) => ({ ...s, x: e.data.x, y: e.data.y }));
      if (e.data?.type === "ready") frames.current.forEach(send);
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
    };
  }, []);
  useEffect(
    () => () => {
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    },
    [],
  );
  const change = (patch: Partial<Scene>) =>
    setScene((s) => {
      const next = { ...s, ...patch };
      next.x = Math.max(0, Math.min(500 - next.width, next.x));
      next.y = Math.max(0, Math.min(480 - next.height, next.y));
      return next;
    });
  const option = (patch: HyaliteOptions) =>
    setScene((s) => ({ ...s, opts: { ...s.opts, ...patch } }));
  return (
    <main>
      <header>
        <div>
          <h1>Liquid Glass</h1>
          <p>0.5.0 原版与 TypeScript 等价移植对照</p>
        </div>
        <a
          href="/reference/hyalite-v0.5.0/demo/cases.html"
          target="_blank"
          rel="noreferrer"
        >
          独立原版基准 ↗
        </a>
      </header>
      <div className="workspace">
        <section className="comparison" aria-label="双版本对照">
          <div className="toolbar">
            <div className="segments" aria-label="显示版本">
              {[
                ["both", "并排"],
                ["original", "Original"],
                ["port", "TypeScript"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span>
              {scene.fallback ? "强制 CSS fallback" : "SVG backdrop refraction"}
            </span>
          </div>
          <div className={`panes ${view}`}>
            {["original", "port"].map((engine, i) => (
              <article
                className={`pane ${engine}`}
                key={engine}
                hidden={view !== "both" && view !== engine}
              >
                <h2>
                  {i === 0 ? "Original 0.5.0" : "TypeScript Port"}
                  <span>{i === 0 ? "冻结源码" : "TS ESM 核心"}</span>
                </h2>
                <div className="frame-scroll">
                  <iframe
                    title={i === 0 ? "Original 0.5.0" : "TypeScript Port"}
                    ref={(el) => {
                      frames.current[i] = el;
                    }}
                    src={`/frame.html?engine=${engine}`}
                    onLoad={() => send(frames.current[i])}
                  />
                </div>
              </article>
            ))}
          </div>
          <div className="footnote">
            <span>
              拖动玻璃卡片，两个视图同步。场景固定为 500 ×
              480，避免窗口宽度影响比较。
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
              <option value="stripes">深色斜纹 / 彩色圆形</option>
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
                <output>{scene.opts[key] ?? DEFAULTS[key]}</output>
                <input
                  aria-label={label}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={scene.opts[key] ?? DEFAULTS[key]}
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
