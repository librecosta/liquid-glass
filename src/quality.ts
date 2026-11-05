import type { LiquidGlassOptions } from "./core/types.js";
export type LiquidGlassQuality =
  | "Reference"
  | "Balanced"
  | "Fast"
  | "Optical Balanced";
// Complete historical values, independent of the current library defaults.
// Keep this named baseline and the original golden files unchanged.
const REFERENCE_DEFAULTS = Object.freeze({
  bevel: 37,
  thickness: 59,
  slope: 2.7,
  shape: "squircle",
  blur: 1,
  dispersion: 1.6,
  shade: 0.46,
  rim: 1.76,
  edgeW: 8,
  sat: 0.86,
  edge: 0.32,
  light: -140,
  smooth: 1,
  materialize: 0,
  settle: 0,
  self: false,
} as const satisfies Required<Omit<LiquidGlassOptions, "onBuild">>);

/** Parameter patches for one renderer; switching never requires a remount. */
export const QUALITY_PRESETS = {
  Balanced: { dispersion: 0.8, sat: 1, edge: 0, rim: 0.80 },
  Fast: { dispersion: 0, sat: 1, edge: 0, rim: 0.80 },
  Reference: REFERENCE_DEFAULTS,
  "Optical Balanced": { dispersion: 1.6, sat: 1, edge: 0, rim: 1.76 },
} as const satisfies Record<LiquidGlassQuality, LiquidGlassOptions>;
export const QUALITY_LABELS = {
  Balanced: "Balanced（默认）",
  Fast: "Fast（性能优先）",
  Reference: "Reference（历史参考）",
  "Optical Balanced": "Optical Balanced（实验对照）",
};
export const QUALITY_NOTES = {
  Reference: "历史完整基准，仅供回归比较：色散 1.6、sat=0.86、edge=0.32、rim=1.76。",
  Balanced:
    "库默认画质：色散 0.8、sat=1、edge=0、rim=0.80。保留三通道位移，减弱彩色分离与高光。",
  Fast: "性能优先：色散 0、sat=1、edge=0、rim=0.80。单通道位移，不保留彩色边缘分离。",
  "Optical Balanced":
    "LG-C2 历史实验对照，非正式默认：色散 1.6、sat=1、edge=0、rim=1.76。",
};
