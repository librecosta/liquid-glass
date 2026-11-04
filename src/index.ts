export {
  default,
  Hyalite,
  createLiquidGlass,
  DEFAULTS,
  attach,
  detach,
  refresh,
  watch,
  unwatch,
  setOpts,
  info,
  supported,
  force,
} from "./core/index.js";
export type {
  LiquidGlassOptions,
  LiquidGlassInstance,
  HyaliteAPI,
  HyaliteOptions,
  HyaliteInfo,
  HyaliteProfile,
  HyaliteShape,
  HyaliteWatcher,
} from "./core/types.js";

export { QUALITY_PRESETS } from "./quality.js";
export type { LiquidGlassQuality } from "./quality.js";
