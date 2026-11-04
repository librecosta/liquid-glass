import { StrictMode, useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createLiquidGlass,
  force,
  setOpts,
  DEFAULTS,
  type LiquidGlassOptions,
} from "@librecosta/liquid-glass";
import {
  LiquidGlass,
  LiquidGlassButton,
  LiquidGlassInput,
  useLiquidGlass,
} from "@librecosta/liquid-glass/react";
import "@librecosta/liquid-glass/styles.css";
import "./style.css";

declare global {
  interface Window {
    probe: {
      create: typeof createLiquidGlass;
      force: typeof force;
      legacySet: typeof setOpts;
      refs: () => {
        card: HTMLDivElement | null;
        button: HTMLButtonElement | null;
        input: HTMLInputElement | null;
      };
      builds: () => number;
      cleanupCalls: () => number;
    };
  }
}
let builds = 0,
  cleanupCalls = 0;
const onBuild = () => {
  builds++;
};
function App() {
  const [options, setOptions] = useState<LiquidGlassOptions>({ onBuild });
  const [mounted, setMounted] = useState(true),
    [enabled, setEnabled] = useState(true),
    [alternate, setAlternate] = useState(false);
  const [disabled, setDisabled] = useState(false),
    [radius, setRadius] = useState(false),
    [text, setText] = useState("");
  const [clicks, setClicks] = useState(0),
    [submitted, setSubmitted] = useState("");
  const card = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null),
    input = useRef<HTMLInputElement>(null);
  const custom = useLiquidGlass<HTMLElement>({ options: { onBuild }, enabled });
  const callback = useCallback((node: HTMLDivElement | null) => {
    if (node)
      return () => {
        cleanupCalls++;
      };
  }, []);
  window.probe = {
    create: createLiquidGlass,
    force,
    legacySet: setOpts,
    refs: () => ({
      card: card.current,
      button: button.current,
      input: input.current,
    }),
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
          onClick={() =>
            setOptions((previous) => ({ ...previous, materialize: 1000 }))
          }
        >
          Animate next mount
        </button>
        <button onClick={() => setMounted((v) => !v)}>Toggle mount</button>
        <button onClick={() => setEnabled((v) => !v)}>Toggle effect</button>
        <button onClick={() => setDisabled((v) => !v)}>Toggle disabled</button>
        <button onClick={() => setRadius((v) => !v)}>Toggle radius</button>
        <button onClick={() => setAlternate((v) => !v)}>Swap custom ref</button>
        <button onClick={custom.refresh}>Refresh custom</button>
        <button onClick={() => input.current?.focus()}>Focus input</button>
      </nav>
      {mounted && (
        <div id="subjects">
          <LiquidGlass
            id="a"
            ref={card}
            className={radius ? "sample alternate" : "sample"}
            options={options}
            enabled={enabled}
          >
            Instance A
          </LiquidGlass>
          <LiquidGlass
            id="b"
            className="sample"
            options={{ onBuild }}
            enabled={enabled}
          >
            Instance B
          </LiquidGlass>
          <LiquidGlass
            id="callback"
            ref={callback}
            className="sample"
            options={{ onBuild }}
            enabled={enabled}
          >
            Callback ref cleanup
          </LiquidGlass>
          {alternate ? (
            <article
              id="custom"
              className="liquid-glass sample"
              ref={custom.ref}
            >
              Custom article
            </article>
          ) : (
            <section
              id="custom"
              className="liquid-glass sample"
              ref={custom.ref}
            >
              Custom section
            </section>
          )}
          <form
            id="form"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(
                JSON.stringify(
                  Object.fromEntries(new FormData(e.currentTarget)),
                ),
              );
            }}
          >
            <LiquidGlassButton
              id="action"
              ref={button}
              type="button"
              className="sample action"
              disabled={disabled}
              enabled={enabled}
              options={{ onBuild }}
              onClick={() => setClicks((v) => v + 1)}
            >
              Action {clicks}
            </LiquidGlassButton>
            <label htmlFor="controlled">Email</label>
            <LiquidGlassInput
              id="controlled"
              ref={input}
              name="email"
              type="email"
              placeholder="Your email"
              required
              autoComplete="email"
              value={text}
              onChange={(e) => setText(e.target.value)}
              enabled={enabled}
              options={{ onBuild }}
              wrapperClassName="input-wrapper"
              wrapperStyle={{ borderRadius: radius ? 28 : 12 }}
            />
            <label htmlFor="uncontrolled">Search</label>
            <LiquidGlassInput
              id="uncontrolled"
              name="query"
              type="search"
              defaultValue="initial"
              placeholder="Search"
              enabled={enabled}
              options={{ onBuild }}
              wrapperClassName="input-wrapper"
            />
            <LiquidGlassInput
              id="password"
              name="password"
              type="password"
              defaultValue="secret"
              enabled={enabled}
              options={{ onBuild }}
              wrapperClassName="input-wrapper"
              aria-label="Password"
            />
            <LiquidGlassButton
              id="submit"
              type="submit"
              enabled={enabled}
              options={{ onBuild }}
            >
              Submit
            </LiquidGlassButton>
          </form>
        </div>
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
