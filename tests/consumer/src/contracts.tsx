import {
  createLiquidGlass,
  QUALITY_PRESETS,
  type LiquidGlassOptions,
  type LiquidGlassInstance,
  type LiquidGlassQuality,
} from "@librecosta/liquid-glass";
import { useLiquidGlass } from "@librecosta/liquid-glass/react";
// @ts-expect-error prebuilt components are intentionally not public
import { LiquidGlassButton } from "@librecosta/liquid-glass/react";
// @ts-expect-error historical global management is internal
import { setOpts } from "@librecosta/liquid-glass";
void LiquidGlassButton;
void setOpts;
const quality: LiquidGlassQuality = "Optical Balanced";
const options: LiquidGlassOptions = {
  ...QUALITY_PRESETS[quality],
  bevel: 37,
  shape: "squircle",
};
const make: (el: HTMLElement) => LiquidGlassInstance = (el) =>
  createLiquidGlass(el, options);
void make;
function OwnDOM() {
  const card = useLiquidGlass<HTMLDivElement>({ options }),
    button = useLiquidGlass<HTMLButtonElement>(),
    surface = useLiquidGlass<HTMLSpanElement>();
  const wrong = useLiquidGlass<HTMLInputElement>();
  return (
    <>
      <div ref={card.ref} />
      <button
        ref={button.ref}
        type="submit"
        disabled
        onClick={(e) => e.currentTarget.focus()}
      />
      <span ref={surface.ref} />
      <input
        name="email"
        type="email"
        onChange={(e) => e.currentTarget.value.toLowerCase()}
      />
      {/* @ts-expect-error typed hook ref cannot bind to a button */}
      <button ref={wrong.ref} />
    </>
  );
}
void OwnDOM;
// @ts-expect-error optical options must be numeric
useLiquidGlass({ options: { bevel: "large" } });
