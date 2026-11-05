import { createHash } from "node:crypto";
import { PNG } from "pngjs";

export async function readRenderState(page) {
  return page.evaluate(() => {
    const element = document.getElementById("card");
    const ref = element.style.getPropertyValue("--hyalite");
    return {
      info: window.__engine.info(),
      graph: document.querySelector(ref.slice(4, -1)).outerHTML,
      edge: element.style.getPropertyValue("--hyalite-edge"),
    };
  });
}
// PNG compression and platform font rasterization are not rendering contracts.
// Hash exact decoded map pixels + dimensions and the SVG graph, replacing map
// URLs by pixel hashes and removing generated IDs. Diagnostic profiles and raw
// maxDisplacement can differ by floating-point last bits across V8 versions;
// their rendered map/SVG output is checked exactly here. Original Node math and
// Windows Chrome raw profile/SVG/pixel checks remain independently unchanged.
export function renderDigest(state) {
  const { profile, maxDisplacement, ...info } = state.info;
  const maps = new Map();
  const normalize = (value) => {
    if (typeof value === "string")
      return value
        .replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, (url) => {
          if (!maps.has(url)) {
            const png = PNG.sync.read(
              Buffer.from(url.slice(url.indexOf(",") + 1), "base64"),
            );
            maps.set(
              url,
              `${png.width}x${png.height}:${createHash("sha256").update(png.data).digest("hex")}`,
            );
          }
          return maps.get(url);
        })
        .replace(/liquid-glass-\d+/g, "FILTER");
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, normalize(v)]),
      );
    return value;
  };
  return createHash("sha256")
    .update(JSON.stringify(normalize({ ...state, info })))
    .digest("hex");
}
