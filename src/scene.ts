import type { HyaliteOptions } from "./core/index.ts";

export interface Scene {
  opts: HyaliteOptions;
  background: "stripes" | "grid" | "image";
  image: string;
  width: number;
  height: number;
  radius: string;
  x: number;
  y: number;
  fallback: boolean;
  sample: "card" | "controls";
  revision: number;
}
export const initialScene: Scene = {
  opts: {},
  background: "stripes",
  image: "",
  width: 300,
  height: 220,
  radius: "42px",
  x: 100,
  y: 142,
  fallback: false,
  sample: "card",
  revision: 0,
};
export interface FrameMessage {
  type: "scene";
  scene: Scene;
}
