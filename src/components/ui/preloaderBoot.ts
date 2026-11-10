// Starts the loader's colour waves straight from the page's HTML, before
// React has started (which takes ~2s on a phone): the inline script in
// Preloader runs this the moment the loader's markup is parsed. It lays the
// wave layers over the frame and schedules the first round of waves as
// compositor animations with exact start times, so they rise smoothly even
// while the phone is busy starting the page. Preloader's effect then takes
// over the same waves (window.__plWaves) and carries on from there.
//
// Self-contained on purpose (no imports, no outside references): it's
// turned into a string with toString() and inlined, so everything it needs
// comes in through `cfg`.

export type BootGeom = { key: string; w: number; h: number; top: number; bottom: number; x0: number; x1: number };
export type BootConfig = {
  geom: BootGeom; // the artwork picked for this screen (already set up)
  art: string; // its image, waited for so the waves never show on a blank frame
  outline: string; // that artwork's frame outline path
  waves: { color: string; amp: number; period: number; flow: number }[];
  pool: number;
  riseMs: number;
  everyMs: number;
  count: number; // how many waves to schedule up front
};

export function bootWaves(cfg: BootConfig) {
  // Preloader's effect waits on this (window.__plBoot) and then takes over the
  // waves it started (or starts its own if it resolves empty).
  const w0 = window as unknown as { __plBoot?: Promise<unknown> };
  w0.__plBoot = new Promise((resolve) => {
    const img = new Image();
    img.src = cfg.art;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      try {
        resolve(start());
      } catch {
        resolve(null);
      }
    };
    img.decode().then(go, go);
    setTimeout(go, 2500); // never wait longer than this for the artwork
  });

  function start() {
  const scene = document.getElementById("preloader-scene") as SVGSVGElement | null;
  const host = scene?.closest('[role="status"]') as HTMLElement | null;
  const box = host?.querySelector("[data-waves]") as HTMLElement | null;
  if (!scene || !host || !box || typeof box.animate !== "function") return null;
  const m = scene.getScreenCTM();
  if (!m || !m.a || !m.d) return null;
  const G = cfg.geom;
  const hostRect = host.getBoundingClientRect();

  // the outline's bounding box, and the outline in that box's 0-1 units
  const nums = (cfg.outline.match(/-?[\d.]+/g) || []).map(Number);
  let bx = Infinity, by = Infinity, mx = -Infinity, my = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    bx = Math.min(bx, nums[i]); mx = Math.max(mx, nums[i]);
    by = Math.min(by, nums[i + 1]); my = Math.max(my, nums[i + 1]);
  }
  const bw = mx - bx, bh = my - by;
  let n = 0;
  const unit = cfg.outline.replace(/-?[\d.]+/g, (v) => ((n++ % 2 === 0 ? (Number(v) - bx) / bw : (Number(v) - by) / bh)).toFixed(5));
  host.querySelector("[data-outline-unit]")?.setAttribute("d", unit);
  box.style.left = m.a * bx + m.e - hostRect.left + "px";
  box.style.top = m.d * by + m.f - hostRect.top + "px";
  box.style.width = bw * m.a + "px";
  box.style.height = bh * m.d + "px";

  const band = (a: number, p: number) => {
    const x0 = G.x0 - 2 * p, x1 = G.x1 + p, depth = G.bottom - G.top + 3 * a + 20;
    const pts: string[] = [];
    for (let x = x0; x <= x1; x += 6) pts.push(x.toFixed(1) + " " + (-a * Math.sin(((x - x0) / p) * 2 * Math.PI)).toFixed(2));
    return { d: "M" + pts.join(" L") + " L" + x1 + " " + depth + " L" + x0 + " " + depth + " Z", x: x0, y: -a - 1, w: x1 - x0, h: depth + a + 1 };
  };
  const waveY = (level: number, a: number) => G.bottom + a - level * (G.bottom - G.top + 2 * a);

  const layers = Array.from(box.querySelectorAll("[data-wave]")) as HTMLElement[];
  const now = document.timeline.currentTime as number;
  const flowStart = now;
  const starts: number[] = [];
  for (let k = 0; k < cfg.count && k < cfg.pool; k++) {
    const layer = layers[k % cfg.pool];
    if (!layer) break;
    const w = cfg.waves[k % cfg.waves.length];
    const b = band(w.amp, w.period);
    const svg = layer.querySelector("svg");
    if (!svg) break;
    svg.setAttribute("viewBox", b.x + " " + b.y + " " + b.w + " " + b.h);
    svg.style.left = (b.x - bx) * m.a + "px";
    svg.style.top = b.y * m.d + "px";
    svg.style.width = b.w * m.a + "px";
    svg.style.height = b.h * m.d + "px";
    const path = svg.querySelector("path");
    path?.setAttribute("d", b.d);
    path?.setAttribute("fill", w.color);
    layer.dataset.wave = String(k % cfg.waves.length);
    // on top of the earlier ones: by z-index, never by moving the element,
    // so React later finds the markup exactly as it rendered it
    layer.style.zIndex = String(k + 1);
    const start = now + 20 + k * cfg.everyMs;
    starts.push(start);
    const y = (level: number) => "translateY(" + ((waveY(level, w.amp) - by) * m.d).toFixed(2) + "px)";
    // pinned to exact times on the page's clock (startTime), not "from
    // now": a new animation otherwise starts counting only once the busy
    // main thread gets round to it, and the waves would slip
    layer.animate([{ transform: y(0) }, { transform: y(1) }], {
      duration: cfg.riseMs,
      fill: "both",
      easing: "cubic-bezier(0.45, 0, 0.55, 1)",
    }).startTime = start;
    (layer.firstElementChild as HTMLElement).animate(
      [{ transform: "translateX(0px)" }, { transform: "translateX(" + (w.period * m.a).toFixed(2) + "px)" }],
      { duration: (w.period / w.flow) * 1000, iterations: Infinity, easing: "linear" },
    ).startTime = flowStart;
  }
  return { flowStart, starts, geom: G.key };
  }
}
