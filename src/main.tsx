import {
  StrictMode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import api, { DEFAULTS, type HyaliteOptions } from "./core/index.ts";
import { initialScene, type Scene } from "./scene.ts";
import { SceneView } from "./scene-view.tsx";
import { QUALITY_PRESETS } from "./quality.ts";
import { FINISH_EXPERIMENTS } from "./finish-experiments.ts";
import {
  MATERIALS,
  materialKeys,
  materialNotes,
  PRISMATIC_OPTICS,
  type Material,
} from "./material-presets.ts";
import {
  useLanguage,
  qualityKeys,
  qualityNotes,
  type Translator,
} from "./i18n.ts";
import {
  ControlGroup,
  QualityPicker,
  RangeField,
  SiteFooter,
  SiteHeader,
  Switch,
} from "./site-ui.tsx";
import "./style.css";

declare global {
  interface Window {
    __engine: typeof api;
    __scene: Scene;
    __configure: (patch: Partial<Scene>) => void;
    __ready: boolean;
  }
}
const fixture = new URLSearchParams(location.search).has("fixture");
function sceneFromURL(): Scene {
  const params = new URLSearchParams(location.search);
  const experiment = FINISH_EXPERIMENTS.find(
    (e) => e.id === params.get("experiment"),
  );
  const quality = params.get("quality");
  const base = {
    ...initialScene,
    ...(fixture ? {} : { width: 400, height: 280 }),
    ...(!fixture && ["1", "5", "20"].includes(params.get("instances") ?? "")
      ? { instances: Number(params.get("instances")) } : {}),
    ...(!fixture &&
    ["forest", "grid", "light", "dark"].includes(params.get("background") ?? "")
      ? { background: params.get("background") as Scene["background"] }
      : {}),
  };
  if (experiment)
    return {
      ...base,
      quality: experiment.quality,
      opts: { ...experiment.opts },
    };
  return {
    ...base,
    quality:
      quality && Object.hasOwn(QUALITY_PRESETS, quality)
        ? (quality as Scene["quality"])
        : "Balanced",
  };
}
function useScene() {
  const [scene, setScene] = useState<Scene>(sceneFromURL);
  useEffect(() => {
    window.__engine = api;
    window.__configure = (patch) => setScene((s) => ({ ...s, ...patch }));
  }, []);
  return [scene, setScene] as const;
}
function Fixture() {
  const [scene, setScene] = useScene();
  return (
    <SceneView
      scene={scene}
      onPosition={(x, y) => setScene((s) => ({ ...s, x, y }))}
    />
  );
}
const sliders = {
  opticalGeometry: [
    ["bevel", 1, 120, 1],
    ["thickness", 0, 200, 1],
    ["blur", 0, 12, 0.1],
  ],
  lightColor: [
    ["dispersion", 0, 8, 0.1],
    ["sat", 0, 3, 0.01],
    ["rim", 0, 4, 0.01],
    ["edge", 0, 2, 0.01],
    ["shade", 0, 2, 0.01],
    ["light", -180, 180, 1],
    ["edgeW", 0.5, 32, 0.5],
  ],
  advanced: [
    ["slope", 0.2, 4, 0.05],
    ["smooth", 0, 4, 0.1],
    ["settle", 0, 800, 20],
    ["materialize", 0, 2000, 50],
  ],
} as const;
const experimentKeys = {
  reference: "referenceLabel",
  "edge-0": "edge0",
  "edge-008": "edge008",
  "edge-016": "edge016",
  "sat-1": "sat1",
  optical: "opticalLabel",
  balanced: "balancedLabel",
  fast: "fastLabel",
} as const;
function LiveStage({
  scene,
  t,
  onPosition,
  onBounds,
  material,
  opticalTrial,
  controlsDisabled,
}: {
  scene: Scene;
  t: Translator;
  onPosition: (x: number, y: number) => void;
  onBounds: (b: { width: number; height: number }) => void;
  material: Material;
  opticalTrial: boolean;
  controlsDisabled: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState({ width: 500, height: 480 });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = {
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height) - 42,
      };
      if (next.width < 1 || next.height < 1) return;
      setCanvas(next);
      onBounds(next);
    });
    observer.observe(element.current!);
    return () => observer.disconnect();
  }, [onBounds]);
  return (
    <div className="stage-live" ref={element}>
      <SceneView
        scene={scene}
        t={t}
        canvas={canvas}
        onPosition={onPosition}
        material={material}
        opticalPatch={opticalTrial ? PRISMATIC_OPTICS : undefined}
        controlsDisabled={controlsDisabled}
      />
    </div>
  );
}
function Playground() {
  const { language, setLanguage, t } = useLanguage("pageTitle");
  const [scene, setScene] = useScene();
  const [material, setMaterial] = useState<Material>(() => {
    const value = new URLSearchParams(location.search).get("material");
    return MATERIALS.find((m) => m === value) ?? "clear";
  });
  const [opticalTrial, setOpticalTrial] = useState(false);
  const [controlsDisabled, setControlsDisabled] = useState(false);
  useEffect(() => {
    const url = new URL(location.href);
    if (material !== "clear") url.searchParams.set("material", material);
    else url.searchParams.delete("material");
    // M1-R2 links safely resolve to the approved Clearer default.
    url.searchParams.delete("softVariant");
    if (scene.quality !== "Balanced") url.searchParams.set("quality", scene.quality);
    else url.searchParams.delete("quality");
    if (scene.instances !== 1) url.searchParams.set("instances", String(scene.instances));
    else url.searchParams.delete("instances");
    if (!["image", "forest"].includes(scene.background))
      url.searchParams.set("background", scene.background);
    else url.searchParams.delete("background");
    const experiment = FINISH_EXPERIMENTS.find(
      (e) => e.id === url.searchParams.get("experiment"),
    );
    if (experiment && (
      experiment.quality !== scene.quality ||
      JSON.stringify(experiment.opts) !== JSON.stringify(scene.opts)
    ))
      url.searchParams.delete("experiment");
    history.replaceState(null, "", url);
  }, [material, scene.quality, scene.background, scene.opts, scene.instances]);
  const bounds = useRef({ width: 500, height: 480 }),
    firstSize = useRef(true);
  const imageURL = useRef("");
  const uploadSequence = useRef(0);
  const [imageFeedback, setImageFeedback] = useState<{
    error: boolean;
    name?: string;
  } | null>(null);
  useEffect(
    () => () => {
      uploadSequence.current++;
      if (imageURL.current) URL.revokeObjectURL(imageURL.current);
    },
    [],
  );
  const fit = (s: Scene, center = false) => {
    const width = Math.min(s.width, Math.max(160, bounds.current.width - 32));
    const height = Math.min(s.height, bounds.current.height - 32);
    return {
      ...s,
      width,
      height,
      x: Math.round(
        center
          ? (bounds.current.width - width) / 2
          : Math.max(0, Math.min(bounds.current.width - width, s.x)),
      ),
      y: Math.round(
        center
          ? (bounds.current.height - height) / 2
          : Math.max(0, Math.min(bounds.current.height - height, s.y)),
      ),
    };
  };
  const onBounds = useCallback((next: { width: number; height: number }) => {
    bounds.current = next;
    const center = firstSize.current;
    firstSize.current = false;
    setScene((s) => fit(s, center));
  }, []);
  const change = (patch: Partial<Scene>) =>
    setScene((s) => fit({ ...s, ...patch }));
  const option = (patch: HyaliteOptions) => {
    // Focusing/blurring a number field without an edit must not commit the
    // trial's effective value into the user's saved options.
    if (Object.entries(patch).every(
      ([key, value]) => Reflect.get(effective, key) === value,
    )) return;
    setOpticalTrial(false);
    setScene((s) => ({ ...s, opts: { ...s.opts, ...patch } }));
  };
  const effective = {
    ...DEFAULTS,
    ...QUALITY_PRESETS[scene.quality],
    ...scene.opts,
    ...(opticalTrial ? PRISMATIC_OPTICS : {}),
  };
  const fields = (group: keyof typeof sliders) =>
    sliders[group].map(([key, min, max, step]) => (
      <RangeField
        key={key}
        label={t(key)}
        value={effective[key]}
        min={min}
        max={max}
        step={step}
        t={t}
        unit={
          key === "materialize" || key === "settle"
            ? "ms"
            : ["bevel", "thickness", "blur", "edgeW", "smooth"].includes(key)
              ? "px"
              : undefined
        }
        hint={
          group === "opticalGeometry"
            ? t(`${key}Help` as "bevelHelp" | "thicknessHelp" | "blurHelp")
            : undefined
        }
        onChange={(value) => option({ [key]: value })}
      />
    ));
  return (
    <div className="site">
      <SiteHeader
        language={language}
        setLanguage={setLanguage}
        t={t}
        page="playground"
      />
      <main id="content" className="site-main" tabIndex={-1}>
        <div className="page-intro">
          <div>
            <h1>{t("heading")}</h1>
            <p>{t("intro")}</p>
          </div>
          <span className="intro-note">{t("coreHook")}</span>
        </div>
        <div className="workspace">
          <section className="preview-column" aria-label={t("stage")}>
            <div className="stage-toolbar">
              <QualityPicker
                quality={scene.quality}
                t={t}
                onChange={(quality) => {
                  setOpticalTrial(false);
                  change({ quality, opts: {} });
                }}
              />
              <button
                className="icon-button"
                onClick={() => setScene((s) => fit(s, true))}
                aria-label={t("center")}
                title={t("center")}
              >
                ⌖
              </button>
            </div>
            <div className="material-toolbar">
              <span id="material-label">{t("material")}</span>
              <div
                className="quality-segments material-segments"
                role="group"
                aria-labelledby="material-label"
              >
                {MATERIALS.map((value) => (
                  <button
                    key={value}
                    aria-pressed={material === value}
                    onClick={() => setMaterial(value)}
                  >
                    {t(materialKeys[value])}
                  </button>
                ))}
              </div>
              <span className="material-badge">{t("materialExperiment")}</span>
            </div>
            <div className="stage-frame">
              <LiveStage
                scene={scene}
                t={t}
                onBounds={onBounds}
                onPosition={(x, y) => setScene((s) => ({ ...s, x, y }))}
                material={material}
                opticalTrial={opticalTrial}
                controlsDisabled={controlsDisabled}
              />
            </div>
            <div className="stage-caption">
              <span>{t("keyboardHint")}</span>
              <span>{t(qualityNotes[scene.quality])}</span>
              <span>{t(materialNotes[material])}</span>
              {opticalTrial && (
                <strong role="status">{t("opticalTrialActive")}</strong>
              )}
            </div>
          </section>
          <aside className="properties" aria-label={t("properties")}>
            <div className="properties-heading">
              <h2>{t("properties")}</h2>
              <button
                className="quiet-button"
                onClick={() => {
                  uploadSequence.current++;
                  if (imageURL.current) URL.revokeObjectURL(imageURL.current);
                  imageURL.current = "";
                  setImageFeedback(null);
                  setMaterial("clear");
                  setOpticalTrial(false);
                  setControlsDisabled(false);
                  setScene((s) =>
                    fit(
                      {
                        ...initialScene,
                        width: 400,
                        height: 280,
                        revision: s.revision + 1,
                      },
                      true,
                    ),
                  );
                }}
              >
                {t("reset")}
              </button>
            </div>
            <p className="quality-note">{t(qualityNotes[scene.quality])}</p>
            <ControlGroup title={t("scene")} initialOpen>
              <label className="select-field">
                {t("background")}
                <select
                  value={scene.background}
                  onChange={(e) =>
                    change({
                      background: e.target.value as Scene["background"],
                    })
                  }
                >
                  <option value="forest">{t("forest")}</option>
                  <option value="grid">{t("grid")}</option>
                  <option value="light">{t("lightBackground")}</option>
                  <option value="dark">{t("darkBackground")}</option>
                  <option value="image">{t("image")}</option>
                </select>
              </label>
              {scene.background === "image" && (
                <div className="upload-field">
                  <label className="upload-button">
                    {t("upload")}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={t("upload")}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const sequence = ++uploadSequence.current,
                          next = URL.createObjectURL(file),
                          image = new Image();
                        image.src = next;
                        try {
                          await image.decode();
                          if (sequence !== uploadSequence.current) {
                            URL.revokeObjectURL(next);
                            return;
                          }
                          if (imageURL.current)
                            URL.revokeObjectURL(imageURL.current);
                          imageURL.current = next;
                          change({ image: next });
                          setImageFeedback({ error: false, name: file.name });
                        } catch {
                          URL.revokeObjectURL(next);
                          if (sequence === uploadSequence.current)
                            setImageFeedback({ error: true });
                        }
                      }}
                    />
                  </label>
                  <p className="field-hint">{t("uploadHint")}</p>
                  <p className="field-hint" role="status">
                    {imageFeedback &&
                      t(imageFeedback.error ? "uploadError" : "uploaded", {
                        name: imageFeedback.name ?? "",
                      })}
                  </p>
                </div>
              )}
              <div className="field-pair">
                <label className="select-field">
                  {t("instances")}
                  <select
                    value={scene.instances}
                    onChange={(e) => change({ instances: +e.target.value })}
                  >
                    {[1, 5, 20].map((n) => (
                      <option key={n} value={n}>
                        {t(n === 1 ? "oneInstance" : "manyInstances", {
                          count: n,
                        })}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  {t("sample")}
                  <select
                    value={scene.sample}
                    onChange={(e) =>
                      change({ sample: e.target.value as Scene["sample"] })
                    }
                  >
                    <option value="card">{t("cardSample")}</option>
                    <option value="controls">{t("controlsSample")}</option>
                  </select>
                </label>
              </div>
              {scene.sample === "controls" && (
                <Switch
                  label={t("disableButtons")}
                  checked={controlsDisabled}
                  onChange={setControlsDisabled}
                />
              )}
            </ControlGroup>
            <ControlGroup title={t("geometry")} initialOpen>
              <label className="select-field">
                {t("radius")}
                <select
                  value={scene.radius}
                  onChange={(e) =>
                    change(
                      e.target.value === "50%"
                        ? { radius: "50%", width: 240, height: 240 }
                        : { radius: e.target.value },
                    )
                  }
                >
                  <option value="42px">{t("rounded")}</option>
                  <option value="50%">{t("capsule")}</option>
                  <option value="48px 12px 64px 4px">{t("asymmetric")}</option>
                  <option value="24px 24px 0 0">{t("topRounded")}</option>
                  <option value="30px / 50px">{t("elliptical")}</option>
                </select>
              </label>
              <RangeField
                label={t("width")}
                value={scene.width}
                min={160}
                max={Math.min(520, bounds.current.width - 32)}
                t={t}
                unit="px"
                onChange={(width) => change({ width })}
              />
              <RangeField
                label={t("height")}
                value={scene.height}
                min={120}
                max={Math.min(400, bounds.current.height - 32)}
                t={t}
                unit="px"
                onChange={(height) => change({ height })}
              />
            </ControlGroup>
            <ControlGroup title={t("opticalGeometry")} initialOpen>
              {fields("opticalGeometry")}
            </ControlGroup>
            <ControlGroup title={t("lightColor")}>
              <p className="field-hint">{t("qualityHint")}</p>
              {fields("lightColor")}
            </ControlGroup>
            <ControlGroup title={t("advanced")}>
              <Switch
                label={t("tryOptics")}
                checked={opticalTrial}
                onChange={setOpticalTrial}
              />
              <p className="field-hint">{t("tryOpticsHelp")}</p>
              <label className="select-field">
                {t("shape")}
                <select
                  value={effective.shape}
                  onChange={(e) =>
                    option({ shape: e.target.value as HyaliteOptions["shape"] })
                  }
                >
                  {(["squircle", "circle", "lip"] as const).map((shape) => (
                    <option key={shape} value={shape}>
                      {t(shape)}
                    </option>
                  ))}
                </select>
              </label>
              {fields("advanced")}
              <Switch
                label={t("self")}
                checked={effective.self}
                onChange={(self) => option({ self })}
              />
              <Switch
                label={t("fallback")}
                checked={scene.fallback}
                onChange={(fallback) => change({ fallback })}
              />
              <label className="select-field">
                {t("compare")}
                <select
                  value={
                    FINISH_EXPERIMENTS.find(
                      (e) =>
                        e.quality === scene.quality &&
                        JSON.stringify(e.opts) === JSON.stringify(scene.opts),
                    )?.id ?? ""
                  }
                  onChange={(e) => {
                    const experiment = FINISH_EXPERIMENTS.find(
                      (v) => v.id === e.target.value,
                    );
                    if (experiment) {
                      setOpticalTrial(false);
                      change({
                        quality: experiment.quality,
                        opts: { ...experiment.opts },
                      });
                    }
                  }}
                >
                  <option value="" disabled>
                    {t("custom")}
                  </option>
                  {FINISH_EXPERIMENTS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {t(experimentKeys[e.id as keyof typeof experimentKeys])}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="full-button"
                onClick={() => change({ revision: scene.revision + 1 })}
              >
                {t("replay")}
              </button>
              <p className="field-hint">{t("advancedHint")}</p>
            </ControlGroup>
          </aside>
          <section className="code-section code-panel">
            <div>
              <h2>{t("codeTitle")}</h2>
              <p>{t("codeHint")}</p>
            </div>
            <pre tabIndex={0}>
              <code>
                <span className="code-comment">// {t("balancedNote")}</span>
                {"\n"}
                {`const glass = createLiquidGlass(element);\nglass.setOptions(QUALITY_PRESETS.Fast);\nglass.setOptions({ ...QUALITY_PRESETS.Balanced, rim: 0.5 });`}
              </code>
            </pre>
          </section>
        </div>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>{fixture ? <Fixture /> : <Playground />}</StrictMode>,
);
