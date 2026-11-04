import { useEffect, useLayoutEffect, useRef, useState } from "react";
import api, {
  createLiquidGlass,
  type LiquidGlassInstance,
} from "./core/index.ts";
import { QUALITY_PRESETS } from "./quality.ts";
import type { Scene } from "./scene.ts";
import { useDrag } from "./drag.ts";
import forest from "./assets/forest.jpg";
import "./scene.css";

export function SceneView({
  scene,
  onPosition,
}: {
  scene: Scene;
  onPosition: (x: number, y: number) => void;
}) {
  const surface = useRef<HTMLDivElement>(null),
    position = useRef<HTMLDivElement>(null);
  const bindings = useRef<LiquidGlassInstance[]>([]),
    count = useRef(0);
  const [builds, setBuilds] = useState(0),
    [clicks, setClicks] = useState(0),
    [supported, setSupported] = useState(false);
  const options = () => ({
    ...api.DEFAULTS,
    ...QUALITY_PRESETS[scene.quality],
    ...scene.opts,
  });
  const latest = useRef(options());
  latest.current = options();
  const onBuild = useRef(() => {
    count.current++;
    setBuilds(count.current);
  }).current;
  const drag = useDrag(position, scene, onPosition);
  useLayoutEffect(() => {
    setSupported(api.force(scene.fallback ? false : null));
    bindings.current = Array.from(
      surface.current!.querySelectorAll<HTMLElement>(".glass"),
    ).map((el) => createLiquidGlass(el, { ...latest.current, onBuild }));
    window.__ready = true;
    return () => {
      bindings.current.forEach((b) => b.destroy());
      bindings.current = [];
      window.__ready = false;
    };
  }, [scene.fallback, scene.sample, scene.revision, scene.instances, onBuild]);
  useLayoutEffect(() => {
    bindings.current.forEach((b) =>
      b.setOptions({ ...latest.current, onBuild }),
    );
  }, [scene.opts, scene.quality, onBuild]);
  useEffect(() => {
    window.__scene = scene;
  }, [scene]);
  return (
    <div className="scene-shell">
      <div
        id="scene"
        ref={surface}
        className={`scene ${scene.background}`}
        style={
          scene.background === "grid"
            ? undefined
            : {
                backgroundImage: `url("${scene.background === "forest" ? forest : scene.image}")`,
              }
        }
      >
        {Array.from({ length: scene.instances }, (_, i) => (
          // Translate an unbound wrapper so movement cannot trigger the glass's
          // radius observer or force geometry reads on every pointer event.
          <div
            key={i}
            id={i === 0 ? "position" : undefined}
            ref={i === 0 ? position : undefined}
            className="card-position"
            style={{
              width: scene.width,
              height: scene.height,
              borderRadius: scene.radius,
              zIndex: i === 0 && scene.instances > 1 ? 1 : undefined,
              transform: `translate(${i === 0 ? scene.x : (scene.x + i * 13) % Math.max(1, 500 - scene.width)}px, ${i === 0 ? scene.y : (scene.y + i * 17) % Math.max(1, 480 - scene.height)}px)`,
            }}
          >
            <div
              id={i === 0 ? "card" : undefined}
              className={`glass card ${scene.opts.self ? "self" : ""}`}
              style={{
                width: scene.width,
                height: scene.height,
                borderRadius: scene.radius,
              }}
            >
              {i === 0 && (
                <div
                  className="drag-handle"
                  role="button"
                  tabIndex={0}
                  aria-label="移动卡片"
                  {...drag}
                >
                  ⠿ <span>拖动卡片</span>
                </div>
              )}
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
                  <label
                    htmlFor={i === 0 ? "native-input" : `native-input-${i}`}
                  >
                    输入文字
                    <input
                      id={i === 0 ? "native-input" : `native-input-${i}`}
                      className="glass native-input"
                      placeholder="保持原生输入行为"
                    />
                  </label>
                  <button
                    id={i === 0 ? "native-button" : undefined}
                    className="glass native-button"
                    onClick={() => setClicks((n) => n + 1)}
                  >
                    点击计数 {clicks}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="frame-status">
        <span>
          {supported ? "SVG refraction 可用" : "CSS fallback"} / {scene.quality}
        </span>
        <span>贴图构建 {builds}</span>
      </div>
    </div>
  );
}
