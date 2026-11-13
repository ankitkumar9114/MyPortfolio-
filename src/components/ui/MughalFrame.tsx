"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PLANT } from "./cornerPlantEdge";
import { MANDALA_EDGE, MANDALA_TIPS } from "./mandalaEdge";
import { gsap } from "@/lib/gsap";
import { LOADER_REVEAL, type LoaderReveal } from "@/lib/loaderReveal";
import { createGoldenReveal, loadThree, waveEdge, type GoldenReveal } from "./goldenReveal";

// Frame for the new loader (border only, for now): the teal textured
// background (loader-bg-teal.webp) inside a border made of two SVGs from
// raw-images (public/graphics/loader-frame/):
//   corner.svg  - an L-shaped top-left corner (39x40, arms 18 thick, gold
//                 diamond), mirrored into the other three corners
//   border.svg  - a 49x18 band tile, repeated along the top and bottom;
//                 border-vertical.svg is the same tile turned for the sides
// Each edge holds a whole number of tiles (stretched a hair to fit exactly),
// so a tile is never cut off at a corner. The band is BAND px thick.

const P = "/graphics/loader-frame/";
// The Figma design this follows ("My portfolio", node 762:8732) is
// 1440x1024; the pieces below are placed in those design units, each kept
// against its nearest edge(s) and scaled by DS (see below).
const DESIGN = { w: 1440, h: 1024 };
const MANDALA = { w: 1311, h: 1310 }; // mandala.svg (raw-images/mandala-lines.svg, lines in the reference painting's muted ochre)
const CORNER = { w: 39, h: 40 }; // top-left L, arms 18 thick
const TILE = { w: 49, h: 18 }; // band tile
const BAND = 20; // border thickness on screen (px)
const OUTER = "#710004"; // band gradient, outer edge
const INNER = "#A0251E"; // band gradient, inner edge
const GOLD = "#F6A225"; // the ornaments' gold
const GOLD_LINE = 2; // px, the inner gold line
const MAX_TURN = (22 * Math.PI) / 180; // tablets: the most a character turns from its pose
const TOUCH = 0.5; // px each fingertip stops short of the centre at 100% (they touch)
const BLACK_LINE = GOLD_LINE;
const FLIGHT_MIN_S = 2.6; // the figures' flight time (0 -> 100%) for the mandala ending, with the page loaded
// the golden ending's timing: a short hold (ORB_HOLD_S), then the
// characters fly in over at least GOLD_FLIGHT_S, so the touch is at 2.2 s
// (when the page is already loaded)
const ORB_HOLD_S = 0.5;
const GOLD_FLIGHT_S = 1.7;
const GOLD_BURST_S = 1.88; // s: the golden explosion starts (hands nearly touching); the reveal follows 0.1 s later

// One step of the figures' flight. Two limits, whichever is behind:
//  - the schedule: a smooth ease-in-out from 0 to 100 over the flight time,
//    after the hold (so with the page loaded the touch is exactly at
//    hold + flight - 2.2 s for the golden ending)
//  - real loading: `follow` eases towards the real progress, so on a slow
//    load the figures wait for it instead of arriving early
// The shown value never goes back.
type FlightState = { shown: number; follow: number };
function flightStep(st: FlightState, elapsed: number, dt: number, target: number, reveal: LoaderReveal) {
  const golden = reveal === "golden";
  const hold = golden ? ORB_HOLD_S : 0, flight = golden ? GOLD_FLIGHT_S : FLIGHT_MIN_S;
  const u = Math.min(1, Math.max(0, (elapsed - hold) / flight));
  const scheduled = 100 * (0.5 - Math.cos(Math.PI * u) / 2);
  if (target > st.follow) st.follow = Math.min(target, st.follow + Math.max((target - st.follow) * dt * 4, 10 * dt));
  st.shown = Math.max(st.shown, Math.min(scheduled, st.follow));
  if (st.shown > 99.95) st.shown = 100;
}

// The figures' flight with everything already loaded (progress 100), as a
// function of time: the same steps the live loop takes, at a fixed rate, so
// the preview can show any moment exactly. `shown` 0..100; `touchAt` (s) is
// when they touch.
export function flightAt(seconds: number, reveal: LoaderReveal) {
  const dt = 1 / 240, st: FlightState = { shown: 0, follow: 0 };
  let t = 0, shownAt = 0, touchAt = Infinity;
  while (t < 30) {
    if (t <= seconds) shownAt = st.shown;
    if (st.shown >= 100) {
      touchAt = t;
      break;
    }
    t += dt;
    flightStep(st, t, dt, 100, reveal);
  }
  // the golden ending explodes a little before the touch (GOLD_BURST_S, the
  // hands almost together); the mandala ending starts at the touch
  const endAt = reveal === "golden" ? Math.min(GOLD_BURST_S, touchAt) : touchAt;
  return { shown: seconds >= touchAt ? 100 : shownAt, touchAt, endAt };
}
// how far the flight is (0..1) when the golden explosion starts
let burstReach: number | null = null;
const goldenBurstReach = () => (burstReach ??= flightAt(GOLD_BURST_S, "golden").shown / 100);

// `progress` (0-100, real loading progress from MughalLoader) drives the
// percentage and the figures' flight.
//
// At 100% the fingertips touch and one of two endings plays (`reveal`, by
// default LOADER_REVEAL in lib/loaderReveal.ts):
//   "golden"  - a three.js golden energy explosion and wave (goldenReveal.ts)
// `onReveal` fires as the site starts to show, `onDone` once the loader is gone.
//
// `scrub` (the loader preview only): instead of playing, show the moment
// `scrub` seconds from the start - before the touch worked out from
// flightAt, after it by moving the ending's timeline - so any frame can be
// reached, forwards or backwards; nothing is torn down at the end.
export default function MughalFrame({ progress = 0, reveal = LOADER_REVEAL, onReveal, onDone, scrub }: { progress?: number; reveal?: LoaderReveal; onReveal?: () => void; onDone?: () => void; scrub?: number }) {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  // Until the screen is measured, only the plain teal backdrop shows (no
  // images requested at the wrong size, nothing jumping into place); once
  // measured, the artwork for this screen loads and the flight waits for it.
  const [measured, setMeasured] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const mandalaImgRef = useRef<HTMLImageElement>(null);
  const mandalaLineRef = useRef<SVGSVGElement>(null);
  // the mandala ending's pieces
  const boxRef = useRef<HTMLDivElement>(null);
  // the golden ending's warm light on the two characters
  const ankitGlowRef = useRef<HTMLDivElement>(null);
  const claudeGlowRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef({ onReveal, onDone });
  useEffect(() => {
    cbRef.current = { onReveal, onDone };
  }, [onReveal, onDone]);
  // the flying figures and the number are moved straight in the DOM, every
  // frame, from a smoothed progress value (no React re-render per frame)
  const ankitRef = useRef<HTMLImageElement>(null);
  const claudeRef = useRef<HTMLImageElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(progress);
  useEffect(() => {
    targetRef.current = progress;
  }, [progress]);
  useEffect(() => {
    const fit = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setMeasured(true);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const { w, h } = size;
  // phones get lighter copies of the big pictures (-sm.webp, ~4x smaller)
  const small = Math.min(w, h) < 600;
  const img = (name: string) => `/images/${name}${small ? "-sm" : ""}.webp`;
  const k = BAND / TILE.h; // the band is BAND px thick on every screen; tiles and corners scale with it
  const cw = CORNER.w * k, ch = CORNER.h * k, t = TILE.h * k;

  // a run of whole tiles between the corners (stretched a hair to fit)
  const count = (len: number) => Math.max(1, Math.round(len / (TILE.w * k)));
  const hLen = w - 2 * cw, vLen = h - 2 * ch;
  const hn = count(hLen), vn = count(vLen);
  const hTile = hLen / hn, vTile = vLen / vn;
  const SEAM = 1; // each tile overlaps the next by 1px, so no hairline gaps

  // tiles as <image>s in one SVG
  const tiles: ReactNode[] = [];
  for (let i = 0; i < hn; i++) {
    const x = cw + i * hTile;
    // top: as drawn (gold line inside, at the bottom); bottom: flipped
    tiles.push(<image key={`t${i}`} href={`${P}border.svg`} x={x} y={0} width={hTile + SEAM} height={t} preserveAspectRatio="none" />);
    tiles.push(<image key={`b${i}`} href={`${P}border.svg`} x={x} y={-h} width={hTile + SEAM} height={t} preserveAspectRatio="none" transform="scale(1 -1)" />);
  }
  for (let i = 0; i < vn; i++) {
    const y = ch + i * vTile;
    // left: as drawn (gold line inside, on the right); right: mirrored
    tiles.push(<image key={`l${i}`} href={`${P}border-vertical.svg`} x={0} y={y} width={t} height={vTile + SEAM} preserveAspectRatio="none" />);
    tiles.push(<image key={`r${i}`} href={`${P}border-vertical.svg`} x={-w} y={y} width={t} height={vTile + SEAM} preserveAspectRatio="none" transform="scale(-1 1)" />);
  }

  // --- corner plant panels (top-left, and mirrored top-right), inside the
  // frame's lines
  const inset = t + GOLD_LINE + BLACK_LINE;
  const ps = 0.7 * Math.min(1, Math.max(150, w * 0.27) / PLANT.w); // plant scale (70% of the earlier size)
  const pw = w < 425 ? 123.3 * (w / 390) : PLANT.w * ps, ph = w < 425 ? 85 * (w / 390) : PLANT.h * ps; // phones: as in the Figma phone frame

  // --- the Figma layout. Sizes scale by DS (the design fits the screen);
  // positions are measured from the edge each piece hugs, so on another
  // screen shape every piece stays against its own edge / the centre.
  const DS = Math.min(w / DESIGN.w, h / DESIGN.h);
  const L = (x: number) => x * DS; // from the left edge
  const R = (x: number) => w - (DESIGN.w - x) * DS; // from the right edge
  const C = (x: number) => w / 2 + (x - DESIGN.w / 2) * DS; // from the centre
  const T = (y: number) => y * DS; // from the top edge
  const B = (y: number) => h - (DESIGN.h - y) * DS; // from the bottom edge
  type Piece = { src: string; x: number; y: number; w: number; h: number; rotate?: number; shadow?: string; flip?: boolean; px?: boolean };
  // exported layers (clouds, plant) already carry their rotation, flip and
  // shadow; their box is the layer's export bounds in design units
  // --- phones (below the site's tablet breakpoint, 425 px): the Figma phone
  // frame ("iPhone 13 & 14 - 1", node 785:2457, 390x844), scaled to the
  // screen's width; pieces near the top / bottom keep to that edge, the
  // middle ones (mandala, characters, the middle cloud) to the centre
  const phone = w < 425;
  const MS = w / 390;
  const pT = (y: number) => y * MS, pB = (y: number) => h - (844 - y) * MS, pM = (y: number) => h / 2 + (y - 422) * MS;
  const pX = (x: number) => x * MS;
  const phonePieces: Piece[] = [
    // red flower plants: top centre (upside down) and bottom centre (mirrored)
    { src: img("loader-flower-plant"), x: w / 2 - 272.2 * MS, y: pT(0), w: 544.4 * MS, h: 225 * MS, rotate: 180, px: true },
    { src: img("loader-flower-plant"), x: w / 2 - 272.2 * MS, y: pB(619), w: 544.4 * MS, h: 225 * MS, flip: true, px: true },
    // cloud 3 (left, its export includes its shadow)
    { src: img("loader-cloud-left"), x: pX(-161.5), y: pT(161), w: 345 * MS, h: 145.3 * MS, px: true },
    // cloud 2 (top right)
    { src: "/images/loader-cloud-top-m.webp", x: pX(214), y: pT(67.7), w: 300.6 * MS, h: 151.3 * MS, px: true },
    // cloud 1 (right, below Claude) and cloud 4 (bottom left), both mirrored
    { src: "/images/loader-cloud-flat-m.webp", x: pX(178), y: pM(520), w: 384 * MS, h: 157 * MS, flip: true, shadow: "0 0 8px rgba(0,0,0,0.3)", px: true },
    { src: "/images/loader-cloud-flat-m.webp", x: pX(-123), y: pB(700), w: 387 * MS, h: 175 * MS, flip: true, shadow: "0 0 10px rgba(0,0,0,0.2)", px: true },
  ];
  const pieces: Piece[] = phone ? phonePieces : [
    // red flower plant (40% opacity is baked in): bottom centre, and the same turned upside down at the top centre
    { src: img("loader-flower-plant"), x: C(262), y: B(645), w: 917, h: 379 },
    { src: img("loader-flower-plant"), x: C(262), y: T(0), w: 917, h: 379, rotate: 180 },
    { src: img("loader-cloud-left"), x: L(-210), y: T(179), w: 551, h: 232 }, // cloud 3, half out the left side
    { src: img("loader-cloud-right"), x: R(1036), y: T(333), w: 810, h: 415 }, // cloud 1, under Claude
    { src: img("loader-cloud-bottom"), x: L(15), y: B(765.77), w: 742.5, h: 258.5 }, // cloud 1 again, under Ankit
    { src: img("loader-cloud-top"), x: C(719), y: T(-56), w: 537, h: 226.5 }, // cloud 2, top
  ];
  // the flying figures (drawn over the frame, as in Figma): image size,
  // centre, Figma tilt, shadow, and where the shoulder and the pointing
  // fingertip are in the image (as fractions of its width / height)
  // tablets (the site's tablet range, 425-1024 px wide): the characters 50%
  // bigger, still hugging their corners (Ankit lower left, Claude upper
  // right) - so they start partly off the edges of the frame
  const tablet = w >= 425 && w <= 1024 && h > w; // portrait tablets
  const FK = tablet ? 1.5 : 1; // the characters' scale
  const fL = (x: number) => x * DS * FK, fB = (y: number) => h - (DESIGN.h - y) * DS * FK;
  const fR = (x: number) => w - (DESIGN.w - x) * DS * FK, fT = (y: number) => y * DS * FK;
  // on tablets each is pushed a quarter of its width further into its corner (off the edge)
  const out = (fw: number) => (tablet ? fw * DS * 0.25 : 0);
  const ankit = { w: 701.03 * FK, h: 520.84 * FK, cx: fL(-52 + 707.24 / 2) - out(701.03 * FK), cy: fB(495.61 + 529.22 / 2), rotate: -0.69, shadow: "0 4px 12px rgba(0,0,0,0.5)", shoulder: [960 / 1455, 360 / 1081], tip: [1430 / 1455, 126 / 1081] };
  // phones: Ankit middle left, Claude middle right (tilted 15 deg), from Figma
  if (phone) {
    Object.assign(ankit, { w: (374.446 * MS) / DS, h: (278.197 * MS) / DS, cx: w / 2 - 205.7 * MS, cy: h / 2 + 104.7 * MS, rotate: 1.73 });
  }
  const claude = { w: 683.63 * FK, h: 437.3 * FK, cx: fR(718.27 + 810.44 / 2) + out(683.63 * FK), cy: fT(-40 + 718.11 / 2), rotate: -29.63, shadow: "0 4px 20px rgba(0,0,0,0.8)", shoulder: [480 / 1568, 375 / 1003], tip: [61 / 1568, 316 / 1003] };
  if (phone) {
    Object.assign(claude, { w: (385.735 * MS) / DS, h: (246.742 * MS) / DS, cx: w / 2 + 205.4 * MS, cy: h / 2 - 19.4 * MS, rotate: -15 });
  }
  const r2 = (n: number) => Math.round(n * 100) / 100; // same numbers on server and client
  // the mandala, centred, its height 51% of the screen's shorter side
  const mh = phone ? 332 * MS : Math.min(w, h) * 0.512, mw = (mh * MANDALA.w) / MANDALA.h;
  const mandala = { left: r2(w / 2 - mw / 2), top: r2(h / 2 - mh / 2), width: r2(mw), height: r2(mh) };
  const pieceImg = (p: Piece, i: number) => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative
    <img
      key={i}
      src={p.src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{
        left: r2(p.x),
        top: r2(p.y),
        width: r2(p.px ? p.w : p.w * DS),
        height: r2(p.px ? p.h : p.h * DS),
        transform: [p.rotate ? `rotate(${p.rotate}deg)` : "", p.flip ? "scaleX(-1)" : ""].join(" ").trim() || undefined,
        filter: p.shadow ? `drop-shadow(${p.shadow})` : undefined,
      }}
    />
  );
  // Each figure sits where Figma puts it, then turns about its shoulder so
  // the pointing finger always aims at the centre of the screen. As loading
  // goes 0 -> 100% it glides along its own arm towards the centre, so at
  // 100% the two index fingertips touch there.
  const place = (f: typeof ankit) => {
    const fw = f.w * DS, fh = f.h * DS;
    const left = f.cx - fw / 2, top = f.cy - fh / 2;
    const base = (f.rotate * Math.PI) / 180;
    const turn = (x: number, y: number, a: number) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    // shoulder and fingertip on screen with the Figma tilt (about the image centre)
    const sx = f.shoulder[0] * fw, sy = f.shoulder[1] * fh;
    const [ox, oy] = turn(sx - fw / 2, sy - fh / 2, base);
    const shoulder = [f.cx + ox, f.cy + oy];
    const [ax, ay] = turn((f.tip[0] - f.shoulder[0]) * fw, (f.tip[1] - f.shoulder[1]) * fh, base);
    // extra turn so shoulder -> fingertip points at the screen centre
    let delta = Math.atan2(h / 2 - shoulder[1], w / 2 - shoulder[0]) - Math.atan2(ay, ax);
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // -pi..pi
    // on tablets they only turn a little, keeping their flying pose (the
    // glide below still brings the fingertips together in the centre)
    if (tablet || phone) delta = Math.max(-MAX_TURN, Math.min(MAX_TURN, delta));
    const angle = ((base + delta) * 180) / Math.PI;
    // the fingertip on screen after that turn
    const [rx, ry] = turn(ax, ay, delta);
    const tipX = shoulder[0] + rx, tipY = shoulder[1] + ry;
    // the full glide (at 100%): fingertip to the centre, stopping TOUCH px short
    const toC = Math.hypot(w / 2 - tipX, h / 2 - tipY);
    const k = toC > TOUCH ? (toC - TOUCH) / toC : 0;
    return {
      left, top, fw, fh, sx, sy, angle,
      tx: shoulder[0] - (left + sx), ty: shoulder[1] - (top + sy), // rotate about the shoulder, kept where the Figma tilt put it
      gx: (w / 2 - tipX) * k, gy: (h / 2 - tipY) * k,
    };
  };
  type Placed = ReturnType<typeof place>;
  // the warm light on a character: a gold glow from the fingertip
  // side, masked to the figure's own shape, moved with it
  const figureLight = (src: string, g: Placed, tip: number[], ref: React.RefObject<HTMLDivElement | null>) => (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute will-change-transform"
      style={{
        left: r2(g.left),
        top: r2(g.top),
        width: r2(g.fw),
        height: r2(g.fh),
        transformOrigin: `${r2(g.sx)}px ${r2(g.sy)}px`,
        transform: transformAt(g, 0),
        opacity: 0,
        mixBlendMode: "screen",
        background: `radial-gradient(circle at ${r2(tip[0] * 100)}% ${r2(tip[1] * 100)}%, rgba(255, 196, 96, 0.85) 0%, rgba(242, 160, 50, 0.45) 22%, rgba(217, 120, 30, 0.12) 50%, rgba(217, 120, 30, 0) 72%)`,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }}
    />
  );
  const transformAt = (g: Placed, reach: number) => `translate(${r2(g.tx + g.gx * reach)}px, ${r2(g.ty + g.gy * reach)}px) rotate(${r2(g.angle)}deg)`;
  const figure = (src: string, g: Placed, shadow: string, ref: React.RefObject<HTMLImageElement | null>) => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative figure
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute select-none will-change-transform"
      style={{
        left: r2(g.left),
        top: r2(g.top),
        width: r2(g.fw),
        height: r2(g.fh),
        transformOrigin: `${r2(g.sx)}px ${r2(g.sy)}px`,
        transform: transformAt(g, 0),
        filter: `drop-shadow(${shadow})`,
      }}
    />
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- place() depends only on w and h
  const placed = useMemo(() => ({ ankit: place(ankit), claude: place(claude) }), [w, h]);

  // The golden energy sequence (three.js + bloom, loaded in the background
  // as the loader starts, shaders compiled up front, so it's ready by the
  // touch)
  const fx = useRef<GoldenReveal | null>(null);
  useEffect(() => {
    if (reveal !== "golden") return; // the mandala ending needs no three.js
    let alive = true;
    loadThree()
      .then((kit) => {
        const canvas = fxRef.current;
        if (!alive || !canvas) return;
        fx.current = createGoldenReveal(kit, canvas, window.innerWidth, window.innerHeight, gsap);
      })
      .catch(() => {});
    return () => {
      alive = false;
      fx.current?.dispose();
      fx.current = null;
    };
  }, [reveal]);
  useEffect(() => {
    fx.current?.resize(w, h);
  }, [w, h]);

  // --- what every frame sets, live or scrubbed
  const golden = reveal === "golden";
  // the figures, their light and the number at a given point of the flight
  const explodedRef = useRef(false);
  const showFlight = (shown: number) => {
    const reach = shown / 100;
    if (ankitRef.current) ankitRef.current.style.transform = transformAt(placed.ankit, reach);
    if (claudeRef.current) claudeRef.current.style.transform = transformAt(placed.claude, reach);
    if (golden) {
      if (ankitGlowRef.current) ankitGlowRef.current.style.transform = transformAt(placed.ankit, reach);
      if (claudeGlowRef.current) claudeGlowRef.current.style.transform = transformAt(placed.claude, reach);
      if (!explodedRef.current) buildUp(reach);
    }
    const n = String(Math.floor(shown + 1e-6));
    if (numRef.current && numRef.current.textContent !== n) {
      numRef.current.textContent = n;
      statusRef.current?.setAttribute("aria-label", `Loading ${n}%`);
    }
  };
  // the golden build-up as they approach (k: 0 far apart .. 1 touching)
  const buildUp = (k: number) => {
    // no light on the characters yet: it comes from the explosion (mandalaGlow)
    if (ankitGlowRef.current) ankitGlowRef.current.style.opacity = "0";
    if (claudeGlowRef.current) claudeGlowRef.current.style.opacity = "0";
    // the mandala starts to light up (opacity only - no filters)
    for (const el of [mandalaImgRef.current, mandalaLineRef.current]) {
      if (!el) continue;
      el.style.opacity = String(r2(0.3 + 0.35 * k));
      el.style.filter = "";
    }
  };
  // the loader is cut along the golden wave's ragged edge (the same
  // formula the shader draws), so the site shows inside it
  const cut = (wave: { radius: number; rag: number; time: number } | null) => {
    const root = rootRef.current;
    if (!root) return;
    if (!wave) {
      root.style.clipPath = "";
      return;
    }
    // the loader's actual size now (it may have been resized since the
    // explosion started), so the opening is always centred on the screen
    const W = root.clientWidth || w, H = root.clientHeight || h;
    const cx = W / 2, cy = H / 2, pts: string[] = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2, r = Math.max(0, wave.radius + wave.rag * waveEdge(a, wave.time));
      pts.push(`${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`);
    }
    root.style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z M${pts.join("L")}Z")`;
  };
  // the mandala lit up by the explosion (golden)
  const mandalaGlow = (g: number) => {
    // the explosion's light on both characters, as strong as it is bright
    const light = String(r2(Math.min(1, g) * 0.9));
    if (ankitGlowRef.current) ankitGlowRef.current.style.opacity = light;
    if (claudeGlowRef.current) claudeGlowRef.current.style.opacity = light;
    for (const el of [mandalaImgRef.current, mandalaLineRef.current]) {
      if (!el) continue;
      el.style.opacity = String(r2(0.65 + 0.35 * g));
      el.style.filter = g > 0.01 ? `brightness(${r2(1 + 0.9 * g)}) drop-shadow(0 0 ${r2(14 * g)}px rgba(242, 181, 68, ${r2(0.85 * g)}))` : "";
    }
  };
  // start the ending (paused, and kept at the end, when scrubbing)
  type Tl = { time: () => number; seek: (t: number, suppress?: boolean) => unknown; duration: () => number };
  const startEnding = (scrubbing: boolean): Tl | null => {
    const root = rootRef.current;
    const hooks = {
      cut,
      mandala: mandalaGlow,
      onReveal: () => cbRef.current.onReveal?.(),
      onDone: () => cbRef.current.onDone?.(),
    };
    if (golden && fx.current) return fx.current.play(hooks, { scrub: scrubbing });
    if (scrubbing) return null; // three.js not ready yet: try again on the next move
    // no WebGL: a plain fade instead
    hooks.onReveal();
    if (root) gsap.to(root, { opacity: 0, duration: 0.6, ease: "power1.inOut", onComplete: hooks.onDone });
    else hooks.onDone();
    return null;
  };

  // The live animation: one loop moves both figures and the number until
  // they touch, then hands over to the ending. The shown value eases
  // towards the real progress (never faster than the flight time), so jumps
  // in loading never make the figures jerk.
  const scrubbing = scrub !== undefined;
  // the artwork for this screen, loaded first and at high priority; the
  // flight starts once the characters and clouds are in (or after 4 s at most)
  useEffect(() => {
    if (!measured) return;
    let done = false;
    const go = () => {
      if (!done) setArtReady(true);
      done = true;
    };
    const names = w < 425 ? ["flying-ankit", "flying-claude", "loader-cloud-left", "loader-flower-plant", "corner-plant"] : ["flying-ankit", "flying-claude", "loader-cloud-left", "loader-cloud-right", "loader-cloud-bottom", "loader-cloud-top", "loader-flower-plant", "corner-plant"];
    const extra = w < 425 ? ["/images/loader-cloud-top-m.webp", "/images/loader-cloud-flat-m.webp"] : [];
    const loads = [...names.map(img), ...extra].map(
      (src) =>
        new Promise<void>((res) => {
          const im = new Image();
          im.fetchPriority = "high";
          im.decoding = "async";
          im.onload = () => im.decode().then(() => res(), () => res());
          im.onerror = () => res();
          im.src = src;
        }),
    );
    Promise.all(loads).then(go);
    const t = window.setTimeout(go, 4000);
    return () => {
      done = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- img() follows `small`
  }, [measured, small]);

  useEffect(() => {
    if (scrubbing || !artReady) return;
    let raf = 0, last = 0, start = 0;
    const st: FlightState = { shown: 0, follow: 0 };
    const tick = (now: number) => {
      if (!start) start = last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      flightStep(st, (now - start) / 1000, dt, Math.min(100, Math.max(0, targetRef.current ?? 0)), reveal);
      showFlight(st.shown);
      const endNow = golden ? st.shown >= goldenBurstReach() * 100 - 1e-6 : st.shown >= 100;
      if (endNow && !explodedRef.current) {
        // the ending starts (golden: the explosion, while the hands close
        // the last gap), the ending takes it from here
        explodedRef.current = true;
        startEnding(false);
      }
      if (st.shown >= 100) return; // they've touched: nothing left to move
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only read refs and layout
  }, [placed, reveal, scrubbing, artReady]);

  // The scrubbed preview: show the moment `scrub` seconds from the start
  const endingRef = useRef<Tl | null>(null);
  useEffect(() => {
    if (scrub === undefined) return;
    const { shown, endAt } = flightAt(scrub, reveal);
    explodedRef.current = scrub >= endAt;
    if (scrub < endAt) {
      showFlight(shown);
      endingRef.current?.seek(0, false); // the ending not started yet
      if (golden && endingRef.current) {
        cut(null);
        buildUp(shown / 100);
      }
    } else {
      showFlight(shown);
      if (!endingRef.current) endingRef.current = startEnding(true);
      endingRef.current?.seek(scrub - endAt, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only read refs and layout
  }, [scrub, placed, reveal]);

  const corner = (left: number, top: number, flip: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative SVG
    <img
      key={flip}
      src={`${P}corner.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute select-none"
      style={{ left, top, width: cw, height: ch, transform: flip }}
    />
  );
  // not measured yet (before the page's scripts run): just the backdrop
  if (!measured) return <div className="fixed inset-0 z-[1000]" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }} aria-label="Loading" role="status" />;
  return (
    <>
      <div ref={rootRef} data-loader-root="" data-ready={artReady || scrubbing ? "" : undefined} className="fixed inset-0 z-[1000] overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* corner plant panels */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src={img("corner-plant")} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: inset, top: inset, width: pw, height: ph }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src={img("corner-plant")} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: w - inset - pw, top: inset, width: pw, height: ph, transform: "scaleX(-1)" }} />
      {/* red flower plants and clouds */}
      {pieces.map(pieceImg)}
      {/* the mandala (raw-images/mandala-lines.svg, in the reference painting's
          muted ochre) in the centre, behind the figures' hands, with its
          dotted outline; both turn slowly. The box around them turns and
          swells in the mandala ending, which also lights a bright-gold copy
          and draws the outline in gold. */}
      <div ref={boxRef} className="pointer-events-none absolute" style={mandala}>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
        <img ref={mandalaImgRef} src={`${P}mandala.svg`} alt="" aria-hidden="true" draggable={false} className="mandala-spin absolute inset-0 h-full w-full select-none" style={{ opacity: 0.3 }} />
        <svg ref={mandalaLineRef} aria-hidden="true" className="mandala-spin absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ opacity: 0.3 }}>
          <path d={MANDALA_EDGE} fill="none" stroke="#B9823A" strokeWidth={0.009} strokeLinecap="round" strokeDasharray="0.0001 0.021" />
          {MANDALA_TIPS.map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={0.008} fill="#B9823A" />
          ))}
        </svg>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 block" aria-hidden="true">
        {/* the band: a gradient from the outer edge (#710004) to the inner
            edge (#A0251E) on each side, mitred at the corners; the SVG tiles
            and corners only add the gold ornaments on top */}
        <defs>
          <linearGradient id="band-top" x1="0" y1="0" x2="0" y2={t} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OUTER} />
            <stop offset="1" stopColor={INNER} />
          </linearGradient>
          <linearGradient id="band-bottom" x1="0" y1={h} x2="0" y2={h - t} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OUTER} />
            <stop offset="1" stopColor={INNER} />
          </linearGradient>
          <linearGradient id="band-left" x1="0" y1="0" x2={t} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OUTER} />
            <stop offset="1" stopColor={INNER} />
          </linearGradient>
          <linearGradient id="band-right" x1={w} y1="0" x2={w - t} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OUTER} />
            <stop offset="1" stopColor={INNER} />
          </linearGradient>
        </defs>
        <path d={`M0 0H${w}L${w - t} ${t}H${t}Z`} fill="url(#band-top)" />
        <path d={`M0 ${h}H${w}L${w - t} ${h - t}H${t}Z`} fill="url(#band-bottom)" />
        <path d={`M0 0V${h}L${t} ${h - t}V${t}Z`} fill="url(#band-left)" />
        <path d={`M${w} 0V${h}L${w - t} ${h - t}V${t}Z`} fill="url(#band-right)" />
        {tiles}
        {/* gold line just outside the band (on the background), touching its
            inner edge all the way round */}
        <rect x={t + GOLD_LINE / 2} y={t + GOLD_LINE / 2} width={w - 2 * t - GOLD_LINE} height={h - 2 * t - GOLD_LINE} fill="none" stroke={GOLD} strokeWidth={GOLD_LINE} />
        {/* black line just inside the gold one, touching it all the way round */}
        <rect x={t + GOLD_LINE + BLACK_LINE / 2} y={t + GOLD_LINE + BLACK_LINE / 2} width={w - 2 * (t + GOLD_LINE) - BLACK_LINE} height={h - 2 * (t + GOLD_LINE) - BLACK_LINE} fill="none" stroke="#000000" strokeWidth={BLACK_LINE} />
      </svg>
      {corner(0, 0, "none")}
      {corner(w - cw, 0, "scaleX(-1)")}
      {corner(0, h - ch, "scaleY(-1)")}
      {corner(w - cw, h - ch, "scale(-1, -1)")}
      {/* "LOADING" and the percentage in the bottom-right corner, inside the
          frame - same type as the current loader (Preloader.tsx) */}
      <div className="absolute grid text-white" style={{ left: r2(w - inset - 28), top: r2(h - inset - 22), transform: "translate(-100%, -100%)" }} ref={statusRef} role="status" aria-label="Loading 0%">
        {/* the letters of LOADING spread to span exactly the width of "100%",
            centred over the number */}
        <span aria-hidden="true" className="flex justify-between font-[family-name:var(--font-manrope)] text-[12px] font-bold uppercase leading-none desktop:text-[14px]">
          {"Loading".split("").map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </span>
        <span aria-hidden="true" className="mt-[6px] grid font-[family-name:var(--font-arvo)] font-bold leading-none tabular-nums" style={{ fontSize: "clamp(40px, 5vw, 72px)" }}>
          {/* an invisible "100%" sets the width; the live number sits centred on it */}
          <span className="invisible col-start-1 row-start-1 text-center">
            100<span className="ml-[2px] align-top text-[0.4em]">%</span>
          </span>
          <span className="col-start-1 row-start-1 text-center">
            <span ref={numRef}>0</span>
            <span className="ml-[2px] align-top text-[0.4em]">%</span>
          </span>
        </span>
      </div>
      {/* flying Ankit and flying Claude, over the frame */}
      {figure(img("flying-ankit"), placed.ankit, ankit.shadow, ankitRef)}
      {figure(img("flying-claude"), placed.claude, claude.shadow, claudeRef)}
      {reveal === "golden" && figureLight(img("flying-ankit"), placed.ankit, ankit.tip, ankitGlowRef)}
      {reveal === "golden" && figureLight(img("flying-claude"), placed.claude, claude.tip, claudeGlowRef)}
      </div>
      {/* the golden energy sequence (goldenReveal.ts): a transparent three.js
          canvas over the loader and the site */}
      {reveal === "golden" && <canvas ref={fxRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1001] h-full w-full" />}
    </>
  );
}
