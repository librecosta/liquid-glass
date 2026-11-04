import {
  StrictMode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import Port, { type HyaliteAPI, type HyaliteOptions } from "./core/index.ts";
import { initialScene, type Scene } from "./scene.ts";
import "./frame.css";

declare global {
  interface Window {
    Hyalite?: HyaliteAPI;
    __engine: HyaliteAPI;
    __scene: Scene;
    __configure: (scene: Partial<Scene>) => void;
    __ready: boolean;
  }
}
const original =
  new URLSearchParams(location.search).get("engine") === "original";
if (original)
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/reference/hyalite-v0.5.0/hyalite.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("原版基准加载失败"));
    document.head.append(script);
  });
const api = original ? window.Hyalite! : Port;
window.__engine = api;

function Fixture() {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [clicks, setClicks] = useState(0);
  const [supported, setSupported] = useState(() => api.supported());
  const surface = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  const [builds, setBuilds] = useState(0);
  const opts = useRef(scene.opts);
  opts.current = scene.opts;
  const appliedOptions = useRef("");
  window.__scene = scene;
  useEffect(() => {
    window.__configure = (patch) => setScene((s) => ({ ...s, ...patch }));
    const receive = (event: MessageEvent) => {
      if (
        event.source === parent &&
        event.origin === location.origin &&
        event.data?.type === "scene"
      )
        setScene(event.data.scene);
    };
    window.addEventListener("message", receive);
    parent.postMessage({ type: "ready" }, location.origin);
    return () => {
      window.removeEventListener("message", receive);
    };
  }, []);
  useLayoutEffect(() => {
    const elements = Array.from(
      surface.current!.querySelectorAll<HTMLElement>(".glass"),
    );
    setSupported(api.force(scene.fallback ? false : null));
    for (const el of elements)
      api.attach(el, {
        ...opts.current,
        onBuild: () => {
          count.current++;
          setBuilds(count.current);
        },
      });
    appliedOptions.current = JSON.stringify(opts.current);
    window.__ready = true;
    return () => {
      for (const el of elements) api.detach(el);
      window.__ready = false;
    };
  }, [scene.fallback, scene.sample, scene.revision]);
  useLayoutEffect(() => {
    surface
      .current!.querySelectorAll(".glass")
      .forEach((el) => api.refresh(el));
  }, [scene.radius]);
  useEffect(() => {
    const signature = JSON.stringify(scene.opts);
    if (signature !== appliedOptions.current) {
      appliedOptions.current = signature;
      void api.setOpts({ ...api.DEFAULTS, ...scene.opts });
    }
  }, [scene.opts]);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(
    null,
  );
  return (
    <>
      <div
        id="scene"
        ref={surface}
        className={`scene ${scene.background}`}
        style={
          scene.background === "image" && scene.image
            ? { backgroundImage: `url("${scene.image}")` }
            : undefined
        }
      >
        {scene.background === "image" && !scene.image && (
          <p className="empty-image">在参数栏选择一张本地图片</p>
        )}
        <div className="background-type" aria-hidden="true">
          Glass
          <br />
          in motion.
        </div>
        <div
          id="card"
          className={`glass card ${scene.opts.self ? "self" : ""}`}
          style={{
            width: scene.width,
            height: scene.height,
            borderRadius: scene.radius,
            left: scene.x,
            top: scene.y,
          }}
        >
          <div
            className="drag-handle"
            role="button"
            tabIndex={0}
            aria-label="移动卡片"
            onKeyDown={(e) => {
              const delta: Record<string, number[]> = {
                ArrowLeft: [-10, 0],
                ArrowRight: [10, 0],
                ArrowUp: [0, -10],
                ArrowDown: [0, 10],
              };
              if (delta[e.key]) {
                e.preventDefault();
                const [dx, dy] = delta[e.key];
                const x = Math.max(0, Math.min(500 - scene.width, scene.x + dx)),
                  y = Math.max(0, Math.min(480 - scene.height, scene.y + dy));
                setScene((s) => ({ ...s, x, y }));
                parent.postMessage({ type: "drag", x, y }, location.origin);
              }
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                px: e.clientX,
                py: e.clientY,
                x: scene.x,
                y: scene.y,
              };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const x = Math.round(
                Math.max(
                  0,
                  Math.min(
                    500 - scene.width,
                    drag.current.x + e.clientX - drag.current.px,
                  ),
                ),
              );
              const y = Math.round(
                Math.max(
                  0,
                  Math.min(
                    480 - scene.height,
                    drag.current.y + e.clientY - drag.current.py,
                  ),
                ),
              );
              setScene((s) => ({ ...s, x, y }));
              parent.postMessage({ type: "drag", x, y }, location.origin);
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            ⠿ <span>拖动卡片</span>
          </div>
          {scene.sample === "card" ? (
            <div className="card-copy">
              <h1>Liquid Glass</h1>
              <p>
                光线穿过边缘。
                <br />
                中心保留背景的颜色。
              </p>
              <span>SVG refraction / 0.5.0</span>
            </div>
          ) : (
            <div className="card-copy controls">
              <label htmlFor="native-input">
                输入文字
                <input
                  id="native-input"
                  className="glass native-input"
                  placeholder="保持原生输入行为"
                />
              </label>
              <button
                id="native-button"
                className="glass native-button"
                onClick={() => setClicks((n) => n + 1)}
              >
                点击计数 {clicks}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="frame-status">
        <span>
          {supported ? "SVG refraction 可用" : "CSS fallback"} /{" "}
          {original ? "Original 0.5.0" : "TypeScript Port"}
        </span>
        <span>贴图构建 {builds}</span>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
