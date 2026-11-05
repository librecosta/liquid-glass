import { StrictMode, useCallback, useState, type RefCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  createLiquidGlass,
  DEFAULTS,
  type LiquidGlassOptions,
} from "@librecosta/liquid-glass";
import { useLiquidGlass } from "@librecosta/liquid-glass/react";
import "@librecosta/liquid-glass/styles.css";
import "./style.css";
let builds = 0,
  cleanupCalls = 0;
const onBuild = () => builds++;
const refs: Record<"card" | "button" | "input", HTMLElement | null> = {
  card: null,
  button: null,
  input: null,
};
// Test-app composition only: the package exports no UI components or ref merger.
function useTrackedGlass<T extends HTMLElement>(
  key: "card" | "button" | null,
  options: LiquidGlassOptions,
  enabled: boolean,
) {
  const glass = useLiquidGlass<T>({ options, enabled });
  return useCallback<RefCallback<T>>(
    (node) => {
      glass.ref(node);
      if (key) refs[key] = node;
      return () => {
        glass.ref(null);
        if (key) refs[key] = null;
        cleanupCalls++;
      };
    },
    [glass.ref, key],
  );
}
const inputRef: RefCallback<HTMLInputElement> = (node) => {
  refs.input = node;
  return () => {
    refs.input = null;
  };
};
interface State {
  options: LiquidGlassOptions;
  enabled: boolean;
  disabled: boolean;
  radius: boolean;
  alternate: boolean;
}
function Subjects({
  options,
  enabled,
  disabled,
  radius,
  alternate,
  onSubmit,
}: { onSubmit: (s: string) => void } & State) {
  const a = useTrackedGlass<HTMLDivElement>("card", options, enabled),
    b = useLiquidGlass<HTMLDivElement>({ options: { onBuild }, enabled });
  const callback = useTrackedGlass<HTMLDivElement>(null, { onBuild }, enabled);
  const custom = useLiquidGlass<HTMLElement>({ options: { onBuild }, enabled });
  const action = useTrackedGlass<HTMLButtonElement>(
      "button",
      { onBuild },
      enabled,
    ),
    submit = useLiquidGlass<HTMLButtonElement>({
      options: { onBuild },
      enabled,
    });
  const email = useLiquidGlass<HTMLSpanElement>({
      options: { onBuild },
      enabled,
    }),
    search = useLiquidGlass<HTMLSpanElement>({ options: { onBuild }, enabled }),
    password = useLiquidGlass<HTMLSpanElement>({
      options: { onBuild },
      enabled,
    });
  const [text, setText] = useState(""),
    [clicks, setClicks] = useState(0);
  return (
    <div id="subjects">
      <div
        id="a"
        ref={a}
        className={`liquid-glass sample ${radius ? "alternate" : ""}`}
      >
        Instance A
      </div>
      <div id="b" ref={b.ref} className="liquid-glass sample">
        Instance B
      </div>
      <div id="callback" ref={callback} className="liquid-glass sample">
        Callback ref cleanup
      </div>
      {alternate ? (
        <article id="custom" className="liquid-glass sample" ref={custom.ref}>
          Custom article
        </article>
      ) : (
        <section id="custom" className="liquid-glass sample" ref={custom.ref}>
          Custom section
        </section>
      )}
      <button onClick={custom.refresh}>Refresh custom</button>
      <form
        id="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(
            JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
          );
        }}
      >
        <button
          id="action"
          ref={action}
          type="button"
          className="liquid-glass sample action"
          disabled={disabled}
          onClick={() => setClicks((v) => v + 1)}
        >
          Action {clicks}
        </button>
        <label htmlFor="controlled">Email</label>
        <span
          className="input-wrapper"
          style={{ borderRadius: radius ? 28 : 12 }}
        >
          <span
            ref={email.ref}
            aria-hidden="true"
            className="liquid-glass input-surface"
          />
          <input
            id="controlled"
            ref={inputRef}
            className="native-field"
            name="email"
            type="email"
            placeholder="Your email"
            required
            autoComplete="email"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </span>
        <label htmlFor="uncontrolled">Search</label>
        <span className="input-wrapper">
          <span
            ref={search.ref}
            aria-hidden="true"
            className="liquid-glass input-surface"
          />
          <input
            id="uncontrolled"
            className="native-field"
            name="query"
            type="search"
            defaultValue="initial"
            placeholder="Search"
          />
        </span>
        <span className="input-wrapper">
          <span
            ref={password.ref}
            aria-hidden="true"
            className="liquid-glass input-surface"
          />
          <input
            id="password"
            className="native-field"
            name="password"
            type="password"
            defaultValue="secret"
            aria-label="Password"
          />
        </span>
        <button
          id="submit"
          ref={submit.ref}
          className="liquid-glass"
          type="submit"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
declare global {
  interface Window {
    probe: {
      create: typeof createLiquidGlass;
      refs: () => typeof refs;
      builds: () => number;
      cleanupCalls: () => number;
    };
  }
}
function App() {
  const [options, setOptions] = useState<LiquidGlassOptions>({ onBuild }),
    [mounted, setMounted] = useState(true),
    [enabled, setEnabled] = useState(true),
    [disabled, setDisabled] = useState(false),
    [radius, setRadius] = useState(false),
    [alternate, setAlternate] = useState(false),
    [submitted, setSubmitted] = useState("");
  window.probe = {
    create: createLiquidGlass,
    refs: () => refs,
    builds: () => builds,
    cleanupCalls: () => cleanupCalls,
  };
  return (
    <>
      <nav>
        <button
          onClick={() =>
            setOptions({ bevel: 18, thickness: 25, blur: 2, onBuild })
          }
        >
          Update A
        </button>
        <button onClick={() => setOptions({ ...DEFAULTS, onBuild })}>
          Reset A
        </button>
        <button
          onClick={() => setOptions((p) => ({ ...p, materialize: 1000 }))}
        >
          Animate next mount
        </button>
        <button onClick={() => setMounted((v) => !v)}>Toggle mount</button>
        <button onClick={() => setEnabled((v) => !v)}>Toggle effect</button>
        <button onClick={() => setDisabled((v) => !v)}>Toggle disabled</button>
        <button onClick={() => setRadius((v) => !v)}>Toggle radius</button>
        <button onClick={() => setAlternate((v) => !v)}>Swap custom ref</button>
        <button onClick={() => refs.input?.focus()}>Focus input</button>
      </nav>
      {mounted && (
        <Subjects
          {...{ options, enabled, disabled, radius, alternate }}
          onSubmit={setSubmitted}
        />
      )}
      <output id="submitted">{submitted}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
