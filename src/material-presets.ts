// Playground-only exploration. Never exported by the library entries.
export const MATERIALS = ["clear", "soft", "prismatic"] as const;
export type Material = (typeof MATERIALS)[number];
export type SoftVariant = "current" | "clearer";
export const materialKeys = {
  clear: "clearMaterial",
  soft: "softMaterial",
  prismatic: "prismaticMaterial",
} as const;
export const materialNotes = {
  clear: "clearNote",
  soft: "softNote",
  prismatic: "prismaticNote",
} as const;
// Explicit, reversible optical overlay; material changes never apply this.
export const PRISMATIC_OPTICS = Object.freeze({
  bevel: 42,
  dispersion: 1.4,
  rim: 1.2,
  edge: 0,
});
