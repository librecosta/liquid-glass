import forest from "./assets/forest.jpg";
import type { HyaliteOptions } from "./core/index.ts";
import type { LiquidGlassQuality } from "./quality.ts";

export interface Scene {
  opts: HyaliteOptions;
  background: "forest" | "grid" | "image";
  image: string;
  width: number;
  height: number;
  radius: string;
  x: number;
  y: number;
  fallback: boolean;
  sample: "card" | "controls";
  revision: number;
  quality: LiquidGlassQuality;
  instances: number;
}
export const initialScene: Scene = {
  opts: {},
  background: "forest",
  image: forest,
  width: 300,
  height: 220,
  radius: "42px",
  x: 100,
  y: 142,
  fallback: false,
  sample: "card",
  revision: 0,
  quality: "Balanced",
  instances: 1,
};
