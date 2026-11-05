// Test-only probes; installed before navigation, also in legacy iframe documents.
export function instrument() {
  const m = (window.__perf = {
    maps: 0,
    png: [],
    ro: 0,
    pointers: 0,
    messages: 0,
    commits: 0,
    commitHook: false,
    frames: [],
    longTasks: [],
    active: false,
    started: 0,
    styleReads: 0,
  });
  const computed = getComputedStyle;
  window.getComputedStyle = function (...args) {
    m.styleReads++;
    return computed.apply(window, args);
  };
  // React development temporarily replaces document.createElement during capability
  // checks. Probe the canvas prototype instead: buildMap uses one 2D canvas/map.
  const canvases = new WeakSet(),
    getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    if (args[0] === "2d" && !canvases.has(this)) {
      canvases.add(this);
      m.maps++;
    }
    return getContext.apply(this, args);
  };
  const encode = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    const start = performance.now();
    const v = encode.apply(this, args);
    m.png.push(performance.now() - start);
    return v;
  };
  const RO = ResizeObserver;
  window.ResizeObserver = class extends RO {
    constructor(callback) {
      super((entries, observer) => {
        m.ro++;
        callback(entries, observer);
      });
    }
  };
  addEventListener("pointermove", () => m.pointers++, true);
  addEventListener("message", () => m.messages++);
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      m.commitHook = true;
      const id = this.renderers.size + 1;
      this.renderers.set(id, renderer);
      return id;
    },
    onCommitFiberRoot() {
      m.commits++;
    },
    onCommitFiberUnmount() {},
  };
  try {
    new PerformanceObserver((list) =>
      m.longTasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask", buffered: true });
  } catch {}
  let last = 0,
    raf = 0;
  function frame(t) {
    if (m.active) {
      if (last) m.frames.push(t - last);
      last = t;
      raf = requestAnimationFrame(frame);
    } else last = 0;
  }
  window.__startPerf = (track = true) => {
    cancelAnimationFrame(raf);
    Object.assign(m, {
      maps: 0,
      png: [],
      ro: 0,
      pointers: 0,
      messages: 0,
      commits: 0,
      frames: [],
      longTasks: [],
      styleReads: 0,
      active: track,
      started: performance.now(),
    });
    last = 0;
    if (track) raf = requestAnimationFrame(frame);
  };
  window.__stopPerf = () => {
    m.active = false;
    cancelAnimationFrame(raf);
    return { ...m, elapsed: performance.now() - m.started };
  };
}
