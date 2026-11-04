import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Ref,
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

/** Add className="liquid-glass" and import the explicit styles.css entry. */
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

function useForwardedBinding<T extends HTMLElement>(
  ref: Ref<T> | undefined,
  config: UseLiquidGlassOptions,
) {
  const { ref: bind, refresh } = useLiquidGlass<T>(config);
  const merged = useCallback<RefCallback<T>>(
    (node) => {
      bind(node);
      const cleanup = typeof ref === "function" ? ref(node) : undefined;
      if (ref && typeof ref !== "function") ref.current = node;
      return () => {
        bind(null);
        if (typeof cleanup === "function") cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [bind, ref],
  );
  return { ref: merged, refresh };
}

export type LiquidGlassProps = ComponentPropsWithRef<"div"> &
  UseLiquidGlassOptions;
export function LiquidGlass({
  options,
  enabled,
  ref,
  className = "",
  ...props
}: LiquidGlassProps) {
  const binding = useForwardedBinding(ref, { options, enabled });
  return (
    <div
      {...props}
      ref={binding.ref}
      className={`liquid-glass ${className}`}
      data-liquid-glass-self={options?.self || undefined}
    />
  );
}

export type LiquidGlassButtonProps = ComponentPropsWithRef<"button"> &
  UseLiquidGlassOptions;
export function LiquidGlassButton({
  options,
  enabled,
  ref,
  className = "",
  ...props
}: LiquidGlassButtonProps) {
  const binding = useForwardedBinding(ref, { options, enabled });
  return (
    <button
      {...props}
      ref={binding.ref}
      className={`liquid-glass ${className}`}
      data-liquid-glass-self={options?.self || undefined}
    />
  );
}

export type LiquidGlassInputProps = ComponentPropsWithRef<"input"> &
  UseLiquidGlassOptions & {
    /** Background geometry and layout. Native className/style/ref stay on the input. */
    wrapperClassName?: string;
    wrapperStyle?: CSSProperties;
  };
export function LiquidGlassInput({
  options,
  enabled,
  ref,
  className = "",
  wrapperClassName = "",
  wrapperStyle,
  ...props
}: LiquidGlassInputProps) {
  const binding = useLiquidGlass<HTMLSpanElement>({ options, enabled });
  return (
    <span
      className={`liquid-glass-input ${wrapperClassName}`}
      style={wrapperStyle}
    >
      <span
        aria-hidden="true"
        ref={binding.ref}
        className="liquid-glass liquid-glass-input__surface"
        data-liquid-glass-self={options?.self || undefined}
      />
      <input
        {...props}
        ref={ref}
        className={`liquid-glass-input__field ${className}`}
      />
    </span>
  );
}
