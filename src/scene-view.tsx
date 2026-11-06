import { useEffect, useLayoutEffect, useRef, useState } from "react";
import api, {
  createLiquidGlass,
  type LiquidGlassInstance,
  type HyaliteOptions,
} from "./core/index.ts";
import { QUALITY_PRESETS } from "./quality.ts";
import type { Scene } from "./scene.ts";
import { useDrag } from "./drag.ts";
import forest from "./assets/forest.jpg";
import type { Translator } from "./i18n.ts";
import type { Material } from "./material-presets.ts";
import "./scene.css";

export function SceneView({
  scene,
  onPosition,
  canvas = {width: 500, height: 480},
  t,
  material,
  opticalPatch,
  controlsDisabled = false,
}: {
  scene: Scene;
  onPosition: (x: number, y: number) => void;
  canvas?: {width: number; height: number};
  t?: Translator;
  material?: Material;
  opticalPatch?: HyaliteOptions;
  controlsDisabled?: boolean;
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
    ...opticalPatch,
  });
  const latest = useRef(options());
  latest.current = options();
  const onBuild = useRef(() => {
    count.current++;
    setBuilds(count.current);
  }).current;
  const drag = useDrag(position, scene, onPosition, canvas);
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
  }, [scene.opts, scene.quality, opticalPatch, onBuild]);
  useEffect(() => {
    window.__scene = scene;
  }, [scene]);
  return (
    <div
      className={`scene-shell${t ? " public-scene" : ""}`}
      data-material={t ? material : undefined}
      data-tone={t && scene.background === "light" ? "light" : undefined}
    >
      <div
        id="scene"
        ref={surface}
        className={`scene ${scene.background}`}
        style={{
          ...(t ? {width: canvas.width, height: canvas.height} : {}),
          ...(["grid", "light", "dark"].includes(scene.background) ? {} : {backgroundImage: `url("${scene.background === "forest" ? forest : scene.image}")`}),
        }}
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
              transform: `translate(${i === 0 ? scene.x : (scene.x + i * 13) % Math.max(1, canvas.width - scene.width)}px, ${i === 0 ? scene.y : (scene.y + i * 17) % Math.max(1, canvas.height - scene.height)}px)`,
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
                  aria-label={t ? t("move") : "移动卡片"}
                  {...drag}
                >
                  ⠿ <span>{t ? t("drag") : "拖动卡片"}</span>
                </div>
              )}
              {scene.sample === "card" ? (
                <div className="card-copy">
                  {t ? <>
                    <h2>{t("glassTitle")}</h2>
                    <p>{t("glassLine1")}<br/>{t("glassLine2")}</p>
                    <span>{t("glassFoot")}</span>
                  </> : <><h1>Liquid Glass</h1>
                  <p>
                    光线穿过边缘。
                    <br />
                    中心保留背景的颜色。
                  </p>
                  <span>SVG refraction / 0.5.0</span></>}
                </div>
              ) : (
                <div className="card-copy controls">
                  <label
                    htmlFor={i === 0 ? "native-input" : `native-input-${i}`}
                  >
                    {t ? t("inputLabel") : "输入文字"}
                    <span className="native-input-wrap">
                      <span
                        className="glass native-input-surface"
                        aria-hidden="true"
                      />
                      <input
                        id={i === 0 ? "native-input" : `native-input-${i}`}
                        className="native-input"
                        placeholder={t ? t("inputPlaceholder") : "保持原生输入行为"}
                      />
                    </span>
                  </label>
                  <button
                    id={i === 0 ? "native-button" : undefined}
                    className="glass native-button"
                    disabled={t ? controlsDisabled : undefined}
                    onClick={() => setClicks((n) => n + 1)}
                  >
                    {t ? t("click", {count: clicks}) : `点击计数 ${clicks}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="frame-status">
        <span>
          {t ? t(supported ? "active" : "fallbackStatus") : supported ? "SVG refraction 可用" : "CSS fallback"} / {scene.quality}
        </span>
        <span>{t ? t("sceneSize", canvas) : `贴图构建 ${builds}`}</span>
      </div>
    </div>
  );
}
