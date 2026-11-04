import type { LiquidGlassOptions } from "./core/types.js";
export type LiquidGlassQuality = "Reference" | "Balanced" | "Fast";
/** Explicit experiments; Reference preserves every original optical default. */
export const QUALITY_PRESETS = {
  Reference: {},
  Balanced: { dispersion: 0.8, sat: 1 },
  Fast: { dispersion: 0, sat: 1 },
} as const satisfies Record<LiquidGlassQuality, LiquidGlassOptions>;
export const QUALITY_NOTES = {
  Reference: "默认原画质；色散 1.6，边缘饱和度 0.86。",
  Balanced:
    "实验性：色散 0.8，sat=1。彩色边缘减弱，保留三通道位移；移除边缘去饱和校正，颜色可能更鲜艳。",
  Fast: "实验性：色散 0，sat=1。单通道位移，失去彩色边缘分离和边缘去饱和校正。",
};
