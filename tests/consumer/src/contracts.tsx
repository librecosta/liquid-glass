import { createRef } from "react";
import {
  createLiquidGlass,
  type LiquidGlassOptions,
  type LiquidGlassInstance,
  QUALITY_PRESETS,
  type LiquidGlassQuality,
} from "@librecosta/liquid-glass";
import {
  LiquidGlass,
  LiquidGlassButton,
  LiquidGlassInput,
  useLiquidGlass,
} from "@librecosta/liquid-glass/react";

// This file is typechecked against the installed declarations, not repository source aliases.
const options: LiquidGlassOptions = { bevel: 37, shape: "squircle" };
const quality: LiquidGlassQuality = "Reference";
const experimental: LiquidGlassOptions = QUALITY_PRESETS[quality];
void experimental;
const make: (el: HTMLElement) => LiquidGlassInstance = (el) =>
  createLiquidGlass(el, options);
void make;
<LiquidGlass
  ref={createRef<HTMLDivElement>()}
  aria-label="Container"
  options={options}
/>;
<LiquidGlassButton
  ref={createRef<HTMLButtonElement>()}
  type="submit"
  form="checkout"
  onClick={(e) => e.currentTarget.focus()}
/>;
<LiquidGlassInput
  ref={createRef<HTMLInputElement>()}
  name="email"
  type="email"
  onChange={(e) => e.currentTarget.value.toLowerCase()}
/>;
const custom: typeof useLiquidGlass<HTMLElement> = useLiquidGlass<HTMLElement>;
void custom;
// @ts-expect-error optical option must be numeric
<LiquidGlass options={{ bevel: "large" }} />;
// @ts-expect-error native button type values are preserved
<LiquidGlassButton type="unknown" />;
// @ts-expect-error ref targets the native input, not a wrapper div
<LiquidGlassInput ref={createRef<HTMLDivElement>()} />;
