"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { markPreloaderComplete } from "@/lib/preloaderSignal";
import { FRAME_OUTLINES } from "./preloaderFrames";
import { bootWaves } from "./preloaderBoot";

// Below this, the preloader stays up for at least this long even if every
// image is already cached — long enough for the "Loading" branding to
// actually register, short enough to not feel like an artificial delay.
const MIN_VISIBLE_MS = 1000;
// Upper bound on how long the preloader will ever wait on images before
// giving up and finishing anyway — protects against a single stuck
// request (one that somehow never fires load OR error) holding the whole
// page hostage behind the preloader indefinitely.
const MAX_WAIT_MS = 8000;
// Images that mount a moment after the first render are picked up by one
// more scan this long after the start.
const RESCAN_MS = 400;

// Loads AND decodes an image, so it's ready to paint the instant it scrolls
// into view (decoding a big image mid-scroll is what causes jank).
function prepareImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      img.decode().then(resolve, resolve);
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

// Every image the page uses for THIS screen size: <img> elements that are
// rendered (an element under display:none reports no client rects, so the
// other breakpoints' variants are skipped), plus CSS background images.
// Lazy <img>s are switched to eager, so they load now instead of mid-scroll.
// What the loader waits for: only what the first screens show, i.e. the
// navigation and page background (outside <main>), the hero and the case
// studies (the sections of <main> up to and including #work). Everything
// further down (impact cards, TV, LinkedIn posts, shelf, footer) loads as the
// visitor scrolls towards it (lazy images, posts loaded when near).
function isPriority(el: Element) {
  const main = document.querySelector("main");
  if (!main || !main.contains(el)) return true;
  const work = document.getElementById("work");
  for (const section of Array.from(main.children)) {
    if (section.contains(el)) return true;
    if (work && section.contains(work)) return false;
  }
  return false;
}
function collectImageUrls(): string[] {
  const urls = new Set<string>();
  for (const img of Array.from(document.images)) {
    if (img.getClientRects().length === 0 || !isPriority(img)) continue;
    if (img.loading === "lazy") img.loading = "eager";
    const src = img.currentSrc || img.src;
    if (src) urls.add(src);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body, body *"))) {
    if (!isPriority(el)) continue;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (!m[1].startsWith("data:")) urls.add(new URL(m[1], location.href).href);
    }
  }
  // the phone wall texture is drawn by body::before
  const before = getComputedStyle(document.body, "::before").backgroundImage;
  for (const m of before.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(new URL(m[1], location.href).href);
  return [...urls];
}

// The backdrop artwork, one per screen shape (from raw-images, as WebP), and
// the outline of the empty space inside its central frame (FRAME_OUTLINES,
// traced from a flood fill of that space). The colour waves fill that space,
// so everything below is in the chosen image's own pixels. Per image: its size, the
// frame's space (top and bottom edges, left and right) and the largest
// circle that fits inside it (the reveal zooms about that circle).
type Geom = { key: keyof typeof FRAME_OUTLINES; bg: string; w: number; h: number; top: number; bottom: number; x0: number; x1: number; cx: number; cy: number; r: number };
const GEOMS: Record<keyof typeof FRAME_OUTLINES, Geom> = {
  // Ornate Purple Truck-Art Medallion: laptops, desktops, landscape tablets
  wide: { key: "wide", bg: "/images/loader-bg.webp", w: 1585, h: 992, top: 318, bottom: 677, x0: 560, x1: 1025, cx: 792, cy: 498, r: 154 },
  // "tablet loader": portrait tablets
  tablet: { key: "tablet", bg: "/images/loader-bg-tablet.webp", w: 1024, h: 1536, top: 589, bottom: 1005, x0: 269, x1: 755, cx: 512, cy: 797, r: 170 },
  // "mobile laoder": phones
  phone: { key: "phone", bg: "/images/loader-bg-mobile.webp", w: 941, h: 1671, top: 628, bottom: 1030, x0: 252, x1: 693, cx: 472, cy: 829, r: 166 },
};
// phone: below the tablet: breakpoint (425px); tablet: up to the desktop:
// breakpoint (1025px), held upright (a landscape tablet gets the wide art,
// which suits its shape)
function pickGeom(): Geom {
  if (innerWidth <= 424) return GEOMS.phone;
  return innerWidth <= 1024 && innerHeight >= innerWidth ? GEOMS.tablet : GEOMS.wide;
}
// fits the backdrop to the screen. The phone and tablet artworks are made
// for those screens, so they're always fitted exactly to the whole viewport
// (every edge of the painted border shows). The wide one is stretched
// slightly on screens close to its own shape, and cropped to fill elsewhere,
// since stretching that far would visibly distort it.
function fitMode(g: Geom) {
  if (g.key !== "wide") return "none";
  const r = innerWidth / innerHeight / (g.w / g.h);
  return r > 0.8 && r < 1.25 ? "none" : "xMidYMid slice";
}
// The same choice, made by an inline script as soon as the loader's markup
// is parsed, so the right artwork loads (and only that one) and shows at its
// final size from the very first frame, before the page's scripts run.
const SETUP_SCRIPT = `(function(){var s=document.getElementById("preloader-scene");if(!s)return;var G=${JSON.stringify(GEOMS)};var w=innerWidth,h=innerHeight;var g=w<=424?G.phone:w<=1024&&h>=w?G.tablet:G.wide;var r=w/h/(g.w/g.h);s.setAttribute("preserveAspectRatio",g.key!=="wide"||(r>0.8&&r<1.25)?"none":"xMidYMid slice");s.setAttribute("viewBox","0 0 "+g.w+" "+g.h);s.setAttribute("data-geom",g.key);s.querySelectorAll("[data-art]").forEach(function(e){e.setAttribute("href",g.bg);e.setAttribute("width",g.w);e.setAttribute("height",g.h)})})();`;
// the loading counter's outline + shadow: readable on light and dark colours
const LOADER_TEXT_SHADOW =
  "0 0 1px rgba(40,10,20,0.9), 1px 1px 0 rgba(40,10,20,0.75), -1px 1px 0 rgba(40,10,20,0.75), 1px -1px 0 rgba(40,10,20,0.75), -1px -1px 0 rgba(40,10,20,0.75), 0 2px 10px rgba(40,10,20,0.55)";
// bigger than any of the artworks: the backdrop colour and clip before the
// effect fits them to the screen
const BIG = 2000;
// Colours that rise through the frame one after another (all from the truck
// art: yellow, orange, pink, violet, blue, green); each starts once the one before
// it has filled a quarter of the space, and all reach the top when loading
// is done. amp/period: the wave's height and length (image px); flow: px per
// second the surface moves left to right (a steady glide).
const WAVES = [
  { color: "#FFC21A", amp: 11, period: 220, flow: 95 },
  { color: "#FF7A1A", amp: 10, period: 190, flow: 110 },
  { color: "#F2365F", amp: 11, period: 220, flow: 100 },
  { color: "#9B3FD6", amp: 10, period: 210, flow: 108 },
  { color: "#1E88E5", amp: 10, period: 200, flow: 115 },
  { color: "#3FA34D", amp: 11, period: 220, flow: 105 },
];
// The colours keep coming in a continuous stream, cycling through WAVES, each
// rising over the one before, until the site is ready; there's never a pause
// with the frame sitting full. Each wave takes WAVE_RISE_S to fill the space;
// the next one starts at a quarter of that (WAVE_STAGGER).
const WAVE_RISE_S = 1.4;
const WAVE_STAGGER = 0.25;
const WAVE_EVERY_S = WAVE_RISE_S * WAVE_STAGGER;
// At least this many colours rise before the site shows (more while the
// first screens are still loading); the ones already rising always finish.
const MIN_WAVES = 2;
// DOM wave layers, reused in turn: a layer is only reused once its old wave is
// fully covered (WAVE_RISE_S / WAVE_EVERY_S waves rise at once, one more is
// scheduled ahead, plus a spare).
const WAVE_POOL = Math.ceil(1 / WAVE_STAGGER) + 4;
// Starts the first round of waves from the page's HTML, before React is up
// (see preloaderBoot); runs right after SETUP_SCRIPT has picked the artwork.
const BOOT_SCRIPT = `(function(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var s=document.getElementById("preloader-scene");if(!s)return;var G=${JSON.stringify(
  Object.fromEntries(Object.values(GEOMS).map((g) => [g.key, { key: g.key, w: g.w, h: g.h, top: g.top, bottom: g.bottom, x0: g.x0, x1: g.x1 }])),
)};var O=${JSON.stringify(FRAME_OUTLINES)};var k=s.getAttribute("data-geom")||"wide";var A=${JSON.stringify(Object.fromEntries(Object.values(GEOMS).map((g) => [g.key, g.bg])))};try{(${bootWaves.toString()})({geom:G[k],art:A[k],outline:O[k],waves:${JSON.stringify(WAVES)},pool:${WAVE_POOL},riseMs:${WAVE_RISE_S * 1000},everyMs:${WAVE_EVERY_S * 1000},count:${WAVES.length}})}catch(e){}})();`;
// The final reveal: one more wave rises through the frame, but instead of a
// colour it shows the site (the screen gets a hole the shape of the frame's
// space, filled with the same wavy edge); then that window grows until the
// site fills the screen.
const SITE_WAVE = { amp: 11, period: 220, flow: 100 };
const SITE_FILL_S = 0.8; // the site wave's rise through the frame
const ZOOM_S = 0.8; // the window growing to full screen

// A colour wave: a smooth sine top edge (period `p`, height `a`) along y=0,
// sampled finely, filled down to `depth` below it (enough to reach the
// frame's bottom when the edge is at its top). It starts two periods left of
// the space, so shifting it right by up to one period (the flow) always
// keeps the space covered. Returns the path and its box (scene units).
function waveBand(g: Geom, a: number, p: number) {
  const x0 = g.x0 - 2 * p;
  const x1 = g.x1 + p;
  const depth = g.bottom - g.top + 3 * a + 20;
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 6) pts.push(`${x.toFixed(1)} ${(-a * Math.sin(((x - x0) / p) * 2 * Math.PI)).toFixed(2)}`);
  return { d: `M${pts.join(" L")} L${x1} ${depth} L${x0} ${depth} Z`, x: x0, y: -a - 1, w: x1 - x0, h: depth + a + 1 };
}
// the outline's bounding box, and the outline in that box's 0-1 units (a
// clip path that stretches with the element it clips)
function outlineBox(key: Geom["key"]) {
  const nums = FRAME_OUTLINES[key].match(/-?[\d.]+/g)!.map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  let i = 0;
  const unit = FRAME_OUTLINES[key].replace(/-?[\d.]+/g, (n) => {
    const v = i++ % 2 === 0 ? (Number(n) - x) / w : (Number(n) - y) / h;
    return v.toFixed(5);
  });
  return { x, y, w, h, unit };
}
// The same wavy edge, filled far up above it instead: the part of the
// frame's space the site wave hasn't reached yet (a clip path).
function aboveWavePath(g: Geom, a: number, p: number) {
  const x0 = g.x0 - 2 * p;
  const x1 = g.x1 + p;
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 6) pts.push(`${x.toFixed(1)} ${(-a * Math.sin(((x - x0) / p) * 2 * Math.PI)).toFixed(2)}`);
  return `M${pts.join(" L")} L${x1} ${-2 * g.h} L${x0} ${-2 * g.h} Z`;
}
// a wave whose top edge is at `level` (0 = below the space, 1 = above it)
const waveY = (g: Geom, level: number, a: number) => g.bottom + a - level * (g.bottom - g.top + 2 * a);

/**
 * Full-screen loader: hand-painted truck art whose central frame fills with
 * rising colour waves, one after another, as the page actually loads (every
 * image the page uses on this screen size, the fonts and the LinkedIn
 * embeds). Then the site rises into the frame the same way, and the frame's
 * opening grows until the site fills the screen. Locks page scroll while
 * active. Skips itself entirely under reduced-motion.
 */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const skip = useRef(isReducedMotion());

  useEffect(() => {
    if (skip.current) {
      setDone(true);
      markPreloaderComplete();
      return;
    }

    document.documentElement.style.overflow = "hidden";

    // Backdrop fit: it always fills the screen. On screens close to the
    // artwork's own shape (landscape laptops/tablets) it's stretched slightly
    // so its painted border shows on every edge; elsewhere (phones, very wide
    // monitors) it's cropped to fill, since stretching that far would
    // visibly distort it.
    // The artwork for this screen (see GEOMS; the inline script below has
    // already set it up before the first paint); the waves' shapes follow
    // its frame. Switched again if the screen changes shape (a turned tablet).
    const bg = overlayRef.current?.querySelector("[data-scene]");
    let G = GEOMS.wide;
    const fitBg = () => {
      const next = pickGeom();
      bg?.setAttribute("preserveAspectRatio", fitMode(next));
      if (next === G && bg?.getAttribute("data-geom") === next.key) return;
      G = next;
      bg?.setAttribute("data-geom", G.key);
      bg?.setAttribute("viewBox", `0 0 ${G.w} ${G.h}`);
      bg?.querySelectorAll("[data-art]").forEach((el) => {
        el.setAttribute("href", G.bg);
        el.setAttribute("width", String(G.w));
        el.setAttribute("height", String(G.h));
      });
      const siteWave = bg?.querySelector("[data-site-wave]");
      siteWave?.setAttribute("d", aboveWavePath(G, SITE_WAVE.amp, SITE_WAVE.period));
      siteWave?.setAttribute("transform", `translate(0 ${waveY(G, 0, SITE_WAVE.amp)})`);
      bg?.querySelector("[data-outline]")?.setAttribute("d", FRAME_OUTLINES[G.key]);
    };
    // The purple backing and the clip that cuts the frame's space out of the
    // artwork at the reveal cover only what's on screen (in the scene's own
    // units): the zoom only ever shows less of the scene, never more, so the
    // screen's area at the start covers every frame of it.
    let screenBox = { x: 0, y: 0, w: GEOMS.wide.w, h: GEOMS.wide.h };
    const measureScreen = () => {
      const m = (bg as SVGSVGElement | null)?.getScreenCTM();
      if (!m || !m.a || !m.d) return;
      screenBox = { x: -m.e / m.a, y: -m.f / m.d, w: innerWidth / m.a, h: innerHeight / m.d };
    };
    const fitCover = () => {
      const { x, y, w, h } = screenBox;
      const box = { x: x - 0.02 * w, y: y - 0.02 * h, w: w * 1.04, h: h * 1.04 };
      bg?.querySelectorAll("[data-cover]").forEach((el) => {
        el.setAttribute("x", String(box.x));
        el.setAttribute("y", String(box.y));
        el.setAttribute("width", String(box.w));
        el.setAttribute("height", String(box.h));
      });
      // the screen with the frame's space cut out (even-odd: rect minus outline)
      bg?.querySelector("[data-outside]")?.setAttribute(
        "d",
        `M${box.x} ${box.y} H${box.x + box.w} V${box.y + box.h} H${box.x} Z ${FRAME_OUTLINES[G.key]}`,
      );
    };
    // The colour waves are HTML layers over the frame, moved only by
    // compositor animations (Web Animations on transform), so they keep
    // gliding and rising smoothly even while the page's own loading work
    // blocks the main thread (on phones that froze them for up to ~1/3 s at
    // a time). Their container is clipped to the frame's outline; sizes are
    // the scene's units times its on-screen scale.
    const wavesEl = wavesRef.current;
    let lay = { sx: 1, sy: 1, bx: 0, by: 0 };
    const layoutWaves = () => {
      const m = (bg as SVGSVGElement | null)?.getScreenCTM();
      const host = containerRef.current?.getBoundingClientRect();
      if (!m || !wavesEl || !host) return;
      const box = outlineBox(G.key);
      lay = { sx: m.a, sy: m.d, bx: box.x, by: box.y };
      Object.assign(wavesEl.style, {
        left: `${m.a * box.x + m.e - host.left}px`,
        top: `${m.d * box.y + m.f - host.top}px`,
        width: `${box.w * m.a}px`,
        height: `${box.h * m.d}px`,
      });
      containerRef.current?.querySelector("[data-outline-unit]")?.setAttribute("d", box.unit);
      wavesEl.querySelectorAll<HTMLElement>("[data-wave]").forEach((layer) => {
        const w = WAVES[Number(layer.dataset.wave) % WAVES.length];
        const band = waveBand(G, w.amp, w.period);
        const svg = layer.querySelector("svg")!;
        svg.setAttribute("viewBox", `${band.x} ${band.y} ${band.w} ${band.h}`);
        Object.assign(svg.style, {
          left: `${(band.x - box.x) * m.a}px`,
          top: `${band.y * m.d}px`,
          width: `${band.w * m.a}px`,
          height: `${band.h * m.d}px`,
        });
        svg.querySelector("path")?.setAttribute("d", band.d);
      });
    };
    const fitAll = () => {
      fitBg();
      measureScreen();
      fitCover();
      layoutWaves();
      relaunchAll();
    };
    // Captured once up front for the cleanup function below — by the
    // time cleanup runs, containerRef.current may have already changed
    // (or been nulled out by unmount), so it can't be read fresh there.
    const container = containerRef.current;
    const startedAt = Date.now();
    let finished = false;

    // Wave k (0, 1, 2, …) starts rising at k * WAVE_EVERY_S, in colour
    // WAVES[k % WAVES.length], on top of all the earlier ones. Once loading
    // is done no new colour starts (but never before MIN_WAVES of them); the
    // ones already rising finish filling the frame, and then the site wave
    // rises.
    let ready = false;
    // The loading percentage in the frame's centre: real progress (what the
    // loader has finished out of what it waits for), shown climbing smoothly
    // and always reaching 100 before the site rises in. Written straight
    // into the element, so updating it never re-renders React.
    let total = 0;
    let doneCount = 0;
    let shownPct = 0;
    let lastPctAt = 0;
    const countEl = overlayRef.current?.parentElement?.querySelector<HTMLElement>("[data-count-num]");
    let countTaken = false;
    const updateCount = (now: number) => {
      if (!countTaken) {
        // take over from the boot script's counter, from where it got to
        countTaken = true;
        (window as unknown as { __plCountTaken?: boolean }).__plCountTaken = true;
        shownPct = Number(countEl?.textContent) || 0;
      }
      const target = ready ? 100 : total ? Math.min(95, (doneCount / total) * 100) : 0;
      const dt = lastPctAt ? Math.min(0.1, (now - lastPctAt) / 1000) : 0;
      lastPctAt = now;
      // ease towards the target, but always keep creeping a little while
      // loading (so it never looks stuck), and race to 100 once ready
      if (target <= shownPct) return; // never counts down
      shownPct = Math.min(target, shownPct + Math.max((target - shownPct) * dt * (ready ? 6 : 2.5), (ready ? 60 : 4) * dt));
      const v = String(Math.floor(shownPct));
      if (countEl && countEl.textContent !== v) countEl.textContent = v;
    };
    // The boot script (preloaderBoot) starts the first round of waves before
    // React is up, once the artwork has loaded; wait for it and carry on with
    // those waves (or start afresh if it couldn't, or the screen changed).
    type Boot = { flowStart: number; starts: number[]; geom: string } | null;
    const bootPromise = (window as unknown as { __plBoot?: Promise<Boot> }).__plBoot;
    let booting = !!bootPromise;
    // no boot script (it didn't run): show the waves straight away
    if (!bootPromise && wavesEl) wavesEl.style.opacity = "1";
    let flowStart = document.timeline.currentTime as number; // the glide's phase
    const layers = wavesEl ? Array.from(wavesEl.querySelectorAll<HTMLElement>("[data-wave]")) : [];
    const layerWave = new Array<number>(WAVE_POOL).fill(-1); // wave each layer shows
    const stopLayer = (layer: HTMLElement) => {
      layer.getAnimations().forEach((an) => an.cancel());
      (layer.firstElementChild as HTMLElement | null)?.getAnimations().forEach((an) => an.cancel());
    };
    // starts[k]: when wave k starts rising (document timeline ms). Waves start
    // strictly one after another, each at least WAVE_EVERY_S after the one
    // before; if the page kept the main thread busy and a wave is scheduled
    // late, it simply starts late. Nothing is skipped or fast-forwarded, so
    // every colour shows in order and the last one scheduled is always the
    // one that fills the frame.
    const starts: number[] = [];
    bootPromise?.then((b) => {
      booting = false;
      if (wavesEl) wavesEl.style.opacity = "1"; // the artwork is on screen
      if (b && b.geom === pickGeom().key) {
        flowStart = b.flowStart;
        starts.push(...b.starts);
        starts.forEach((_, k) => (layerWave[k % WAVE_POOL] = k));
        relaunchAll(); // same waves, same timing, now owned here
      } else {
        layers.forEach(stopLayer);
      }
    });
    let stopped = false; // no more waves (loading done, minimum shown)
    const launch = (k: number) => {
      const i = k % WAVE_POOL;
      const layer = layers[i];
      if (!layer) return;
      const w = WAVES[k % WAVES.length];
      const now = document.timeline.currentTime as number;
      if (starts[k] === undefined) starts[k] = Math.max(k ? starts[k - 1] + WAVE_EVERY_S * 1000 : now, now + 20);
      stopLayer(layer);
      if (layerWave[i] !== k) {
        layerWave[i] = k;
        layer.dataset.wave = String(k % WAVES.length);
        layer.querySelector("path")?.setAttribute("fill", w.color);
        layer.style.zIndex = String(k + 1); // on top (z-index: the DOM is never reordered)
      }
      const band = waveBand(G, w.amp, w.period);
      layer.querySelector("svg")?.setAttribute("viewBox", `${band.x} ${band.y} ${band.w} ${band.h}`);
      const y = (level: number) => `translateY(${((waveY(G, level, w.amp) - lay.by) * lay.sy).toFixed(2)}px)`;
      // pinned to exact times on the page's clock (startTime), not "from
      // now": a new animation otherwise starts counting only once the busy
      // main thread gets round to it, and the waves would slip
      layer.animate([{ transform: y(0) }, { transform: y(1) }], {
        duration: WAVE_RISE_S * 1000,
        fill: "both",
        easing: "cubic-bezier(0.45, 0, 0.55, 1)", // gentle start and settle
      }).startTime = starts[k];
      (layer.firstElementChild as HTMLElement).animate(
        [{ transform: "translateX(0px)" }, { transform: `translateX(${(w.period * lay.sx).toFixed(2)}px)` }],
        { duration: (w.period / w.flow) * 1000, iterations: Infinity, easing: "linear" },
      ).startTime = flowStart;
    };
    // after a resize: the same waves again, at the new size, same timing
    function relaunchAll() {
      for (let k = Math.max(0, starts.length - WAVE_POOL); k < starts.length; k++) launch(k);
    }
    fitAll();
    window.addEventListener("resize", fitAll);
    const draw = () => {
      updateCount(document.timeline.currentTime as number);
      if (booting) return;
      const now = document.timeline.currentTime as number;
      const n = starts.length;
      if (!stopped && ready && n >= MIN_WAVES) {
        stopped = true;
        // drop scheduled waves that haven't started yet (the boot script
        // queues a whole round), so the site isn't kept waiting for them
        while (starts.length > MIN_WAVES && starts[starts.length - 1] > now) {
          const k = starts.length - 1;
          const layer = layers[k % WAVE_POOL];
          if (layer) stopLayer(layer);
          layerWave[k % WAVE_POOL] = -1;
          starts.pop();
        }
      }
      // schedule the next wave once the previous one has started (so the
      // next is always queued a slot ahead, with an exact start time)
      if (!stopped && (n === 0 || now >= starts[n - 1])) launch(n);
      // the last colour has filled the frame
      const last = starts.length - 1;
      if (stopped && !revealing && now >= starts[last] + WAVE_RISE_S * 1000) {
        revealing = true;
        // hand over to a solid fill of that colour inside the artwork (what
        // the full frame looks like), so the site wave can cut into it
        const fill = overlayRef.current?.querySelector("[data-final]");
        fill?.setAttribute("fill", WAVES[last % WAVES.length].color);
        fill?.setAttribute("visibility", "visible");
        if (wavesEl) wavesEl.style.visibility = "hidden";
        layers.forEach(stopLayer);
        reveal();
      }
    };
    let revealing = false;
    let raf = 0;
    const tick = () => {
      draw();
      if (!revealing) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Everything the whole page shows on this screen size (see
    // collectImageUrls), not just the first screen: loaded and decoded
    // up front, so scrolling and the scroll animations run smoothly with
    // nothing left to fetch. Fonts are waited on too.
    const seen = new Set<string>();
    const tasks: Promise<void>[] = [];
    const track = (p: Promise<unknown>) => {
      total += 1;
      const t = p.then(
        () => undefined,
        () => undefined,
      ).then(() => {
        doneCount += 1;
      });
      tasks.push(t);
      return t;
    };
    const scan = () => {
      for (const url of collectImageUrls()) {
        if (seen.has(url)) continue;
        seen.add(url);
        track(prepareImage(url));
      }
    };

    function reveal() {
      const overlay = overlayRef.current;
      const scene = overlay?.querySelector<SVGSVGElement>("[data-scene]");
      if (!overlay || !scene) return;
      // the whole artwork zooms in (about the frame's centre), its frame
      // opening with it; the hole is in the artwork's own coordinates, so it
      // scales along
      const zoomed = overlay.querySelector<SVGGElement>("[data-zoom]");
      const { cx, cy, r } = G;
      const place = (k: number) => zoomed?.setAttribute("transform", `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`);
      place(1);
      // from now on the artwork outside the frame and, inside it, only the
      // part above the rising site wave are drawn; below it the site shows
      overlay.querySelector("[data-screen]")?.setAttribute("clip-path", "url(#preloader-outside)");
      const siteWave = overlay.querySelector("[data-site-wave]");
      const siteStart = performance.now();
      const setLevel = (l: number) => {
        const dx = ((performance.now() - siteStart) / 1000) * SITE_WAVE.flow % SITE_WAVE.period;
        siteWave?.setAttribute("transform", `translate(${dx.toFixed(2)} ${waveY(G, l, SITE_WAVE.amp)})`);
      };
      setLevel(0);
      const fill = { l: 0 };
      // zoom until the circle inside the frame covers the whole screen (the
      // artwork around it goes off-screen)
      const m = scene.getScreenCTM();
      const sx = m ? Math.min(Math.abs(m.a), Math.abs(m.d)) : 1;
      const px = m ? m.a * cx + m.e : innerWidth / 2;
      const py = m ? m.d * cy + m.f : innerHeight / 2;
      const reach = Math.hypot(Math.max(px, innerWidth - px), Math.max(py, innerHeight - py));
      const end = (reach / (r * sx)) * 1.1;
      const zoom = { k: 1 };
      gsap
        .timeline({
          onComplete: () => {
            document.documentElement.style.overflow = "";
            setDone(true);
            markPreloaderComplete();
          },
        })
        .to(fill, { l: 1, duration: SITE_FILL_S, ease: "power1.inOut", onUpdate: () => setLevel(fill.l) })
        .to(zoom, {
          k: end,
          duration: ZOOM_S,
          ease: "power3.in",
          onUpdate: function () {
            place(zoom.k);
            // the hero's entrance animations start as the window opens up
            if (this.progress() >= 0.45) markPreloaderComplete();
          },
        });
    }

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      // Guarantees a minimum, consistent display time regardless of how
      // fast (or slow) the images actually resolved — a network so fast
      // everything's already `.complete` shouldn't make the loading
      // screen flash for a single frame.
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        ready = true; // the site wave takes the next slot in the stream (see draw)
      }, remaining);
    }

    // Live progress as each image actually resolves, so the number means
    // something real instead of being a decorative countdown.
    track(document.fonts.ready);
    // The first scan waits a frame: components that pick their layout from
    // the screen size (e.g. the TV scene, desktop/tablet only) first render
    // their server (desktop) version during hydration and swap right after.
    // Scanning straight away would download images (like the TV's, ~1MB)
    // that a phone never shows.
    let firstScan = 0;
    const firstFrame = requestAnimationFrame(() => {
      firstScan = window.setTimeout(scan, 0);
    });
    // a second scan picks up images that mounted after the first render;
    // finish once everything found by then has settled
    const rescan = window.setTimeout(() => {
      scan();
      Promise.all(tasks).then(finish);
    }, RESCAN_MS);

    // Safety net — if some image genuinely never settles, don't hold the
    // page hostage forever; finish() is idempotent (guarded by
    // `finished`) so whichever of this or the Promise.all above resolves
    // first wins and the other becomes a no-op.
    const safety = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.clearTimeout(safety);
      window.clearTimeout(rescan);
      cancelAnimationFrame(firstFrame);
      window.clearTimeout(firstScan);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fitAll);
      gsap.killTweensOf(container);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1000]" aria-label="Loading" role="status">
      <svg ref={overlayRef} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* everything in the image's own pixels, fitted to the screen (see
            fitBg) */}
        <svg
          id="preloader-scene"
          data-scene=""
          width="100%"
          height="100%"
          viewBox={`0 0 ${GEOMS.wide.w} ${GEOMS.wide.h}`}
          preserveAspectRatio="xMidYMid slice"
          // set by the inline script below before the first paint
          suppressHydrationWarning
        >
          {/* All clipping is by vector outlines, not image masks: a mask is
              rendered as an offscreen image every frame, and when the
              browser fails to make it in time the whole loader vanishes for
              a frame (flicker). Geometry is the wide artwork's until the
              effect switches it (see fitBg / fitCover). */}
          <defs>
            {/* the empty space inside the central frame */}
            <clipPath id="preloader-space" clipPathUnits="userSpaceOnUse">
              <path data-outline="" d={FRAME_OUTLINES.wide} suppressHydrationWarning />
            </clipPath>
            {/* the screen with that space cut out (used from the reveal on) */}
            <clipPath id="preloader-outside" clipPathUnits="userSpaceOnUse">
              <path data-outside="" clipRule="evenodd" d={`M0 0 H${BIG} V${BIG} H0 Z ${FRAME_OUTLINES.wide}`} suppressHydrationWarning />
            </clipPath>
            {/* inside the space: the part the site wave hasn't reached yet */}
            <clipPath id="preloader-above" clipPathUnits="userSpaceOnUse">
              <path
                data-site-wave=""
                d={aboveWavePath(GEOMS.wide, SITE_WAVE.amp, SITE_WAVE.period)}
                transform={`translate(0 ${waveY(GEOMS.wide, 0, SITE_WAVE.amp)})`}
                suppressHydrationWarning
              />
            </clipPath>
          </defs>
          <g data-zoom="">
            {/* the artwork (clipped to outside the frame from the reveal on) */}
            <g data-screen="">
              <rect data-cover="" x="0" y="0" width={BIG} height={BIG} fill="#4B1B6B" suppressHydrationWarning />
              <image data-art="bg" suppressHydrationWarning />
            </g>
            {/* inside the frame: the artwork again with the colour waves
                rising over it, cut back from below by the site wave */}
            <g clipPath="url(#preloader-space)">
              <g clipPath="url(#preloader-above)">
                <image data-art="bg" suppressHydrationWarning />
                {/* the last colour, filling the frame, from the reveal on */}
                <rect data-final="" data-cover="" x="0" y="0" width={BIG} height={BIG} visibility="hidden" suppressHydrationWarning />
              </g>
            </g>
          </g>
        </svg>
      </svg>
      {/* the colour waves (see layoutWaves), clipped to the frame's outline */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id="preloader-space-unit" clipPathUnits="objectBoundingBox">
          <path data-outline-unit="" suppressHydrationWarning />
        </clipPath>
      </svg>
      <div
        ref={wavesRef}
        data-waves=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
        // opacity 0 until the artwork is on screen (preloaderBoot / the
        // effect reveal it), so the waves and counter never show early
        style={{ clipPath: "url(#preloader-space-unit)", WebkitClipPath: "url(#preloader-space-unit)", opacity: 0 }}
        suppressHydrationWarning
      >
        {Array.from({ length: WAVE_POOL }, (_, i) => (
          // outer: rise (translateY); inner: glide (translateX); both start
          // parked far below the frame until their wave's turn
          // (the boot script sets their colour, size and stacking before React
          // starts, hence suppressHydrationWarning)
          <div key={i} data-wave={i % WAVES.length} className="absolute left-0 top-0 will-change-transform" style={{ transform: "translateY(100000px)" }} suppressHydrationWarning>
            <div className="will-change-transform">
              <svg className="absolute block overflow-visible" preserveAspectRatio="none" suppressHydrationWarning>
                <path fill={WAVES[i % WAVES.length].color} suppressHydrationWarning />
              </svg>
            </div>
          </div>
        ))}
        {/* "LOADING" + the percentage, centred in the frame, above the waves.
            White with a dark outline and shadow so it reads on every wave
            colour and on the empty frame. Hidden with the waves at the
            reveal. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ zIndex: 10000, textShadow: LOADER_TEXT_SHADOW }}>
          <span className="font-[family-name:var(--font-manrope)] text-[12px] font-bold uppercase leading-none tracking-[0.28em] desktop:text-[14px]">Loading</span>
          <span className="mt-[6px] font-[family-name:var(--font-arvo)] font-bold leading-none" style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>
            <span data-count-num="">0</span>
            <span className="ml-[2px] align-top text-[0.4em]">%</span>
          </span>
        </div>
      </div>
      {/* fits the artwork to this screen (see fitBg) as soon as it's parsed,
          so it shows at its final size from the very first frame instead of
          changing size once the page's scripts load */}
      <script
        dangerouslySetInnerHTML={{
          __html: SETUP_SCRIPT + BOOT_SCRIPT,
        }}
        // the inlined boot code is compiled separately for server and browser
        suppressHydrationWarning
      />
    </div>
  );
}
