import type { LiquidGlassOptions } from "./index.js";
import type { LiquidGlassQuality } from "./quality.js";
// Playground/measurement cases, not additional public product presets.
export const FINISH_EXPERIMENTS: {
  id: string;
  label: string;
  quality: LiquidGlassQuality;
  opts: LiquidGlassOptions;
}[] = [
  {
    id: "reference",
    label: "Reference（历史基准）",
    quality: "Reference",
    opts: {},
  },
  {
    id: "edge-0",
    label: "Reference + edge=0（无 CSS 描边）",
    quality: "Reference",
    opts: { edge: 0 },
  },
  {
    id: "edge-008",
    label: "Reference + edge=0.08",
    quality: "Reference",
    opts: { edge: 0.08 },
  },
  {
    id: "edge-016",
    label: "Reference + edge=0.16",
    quality: "Reference",
    opts: { edge: 0.16 },
  },
  {
    id: "sat-1",
    label: "Reference + sat=1（仅跳过校正）",
    quality: "Reference",
    opts: { sat: 1 },
  },
  {
    id: "optical",
    label: "Optical Balanced（候选）",
    quality: "Optical Balanced",
    opts: {},
  },
  {
    id: "balanced",
    label: "Balanced（既有实验）",
    quality: "Balanced",
    opts: {},
  },
  { id: "fast", label: "Fast（既有实验）", quality: "Fast", opts: {} },
];
