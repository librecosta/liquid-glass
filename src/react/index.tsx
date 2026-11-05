import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";
import {
  createLiquidGlass,
  DEFAULTS,
  type LiquidGlassInstance,
  type LiquidGlassOptions,
} from "../index.js";

export type { LiquidGlassOptions } from "../index.js";
export interface UseLiquidGlassOptions {
  options?: LiquidGlassOptions;
  /** Effect only; unrelated to a native button/input's disabled attribute. */
  enabled?: boolean;
}

/** Bind your own DOM. Optional styles.css consumes the reserved --hyalite properties. */
export function useLiquidGlass<T extends HTMLElement = HTMLDivElement>({
  options,
  enabled = true,
}: UseLiquidGlassOptions = {}) {
  const [node, setNode] = useState<T | null>(null);
  const instance = useRef<LiquidGlassInstance | null>(null);
  const radii = useRef("");
  const radiusSignature = (element: T) => {
    const cs = getComputedStyle(element);
    return [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomRightRadius,
      cs.borderBottomLeftRadius,
    ].join("|");
  };
  const ref = useCallback<RefCallback<T>>((element) => {
    setNode(element);
  }, []);
  useLayoutEffect(() => {
    if (!node) return;
    if (!enabled) {
      const previous = ["--hyalite", "--hyalite-edge"].map((name) => [
        name,
        node.style.getPropertyValue(name),
        node.style.getPropertyPriority(name),
      ]);
      previous.forEach(([name]) => node.style.setProperty(name, "none"));
      return () =>
        previous.forEach(([name, value, priority]) => {
          if (value) node.style.setProperty(name, value, priority);
          else node.style.removeProperty(name);
        });
    }
    const binding = createLiquidGlass(node, options);
    radii.current = radiusSignature(node);
    instance.current = binding;
    return () => {
      binding.destroy();
      instance.current = null;
    };
  }, [node, enabled]);
  useLayoutEffect(() => {
    if (!node || !instance.current) return;
    // React options are a full prop value; missing fields reset to the original defaults.
    instance.current?.setOptions({
      ...DEFAULTS,
      ...options,
      onBuild: options?.onBuild,
    });
    // Inherited radii (notably the input's surface) can change without mutating the bound node.
    const next = radiusSignature(node);
    if (radii.current !== next) {
      radii.current = next;
      instance.current.refresh();
    }
  });
  const refresh = useCallback(() => instance.current?.refresh(), []);
  return { ref, refresh };
}
