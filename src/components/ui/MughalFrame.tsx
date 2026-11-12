"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PLANT } from "./cornerPlantEdge";
import { MANDALA_EDGE, MANDALA_TIPS } from "./mandalaEdge";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { LOADER_REVEAL, type LoaderReveal } from "@/lib/loaderReveal";
import { createGoldenReveal, loadThree, waveEdge, type GoldenReveal } from "./goldenReveal";
import { playMandalaReveal } from "./mandalaReveal";

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
const TOUCH = 0.5; // px each fingertip stops short of the centre at 100% (they touch)
const BLACK_LINE = GOLD_LINE;
const FLIGHT_MIN_S = 2.6; // the figures never fly in faster than this (0 -> 100%)

// `progress` (0-100, real loading progress from MughalLoader) drives the
// percentage and the figures' flight.
//
// At 100% the fingertips touch and one of two endings plays (`reveal`, by
// default LOADER_REVEAL in lib/loaderReveal.ts):
//   "mandala" - the mandala awakens and a golden ring opens the site
//               (mandalaReveal.ts: CSS/SVG + GSAP)
//   "golden"  - a three.js golden energy explosion and wave (goldenReveal.ts)
// `onReveal` fires as the site starts to show, `onDone` once the loader is gone.
export default function MughalFrame({ progress = 0, reveal = LOADER_REVEAL, onReveal, onDone }: { progress?: number; reveal?: LoaderReveal; onReveal?: () => void; onDone?: () => void }) {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const mandalaImgRef = useRef<HTMLImageElement>(null);
  const mandalaLineRef = useRef<SVGSVGElement>(null);
  // the mandala ending's pieces
  const boxRef = useRef<HTMLDivElement>(null);
  const litWrapRef = useRef<HTMLDivElement>(null);
  const litInnerRef = useRef<HTMLDivElement>(null);
  const litLineRef = useRef<SVGSVGElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
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
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const { w, h } = size;
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
  const pw = PLANT.w * ps, ph = PLANT.h * ps;

  // --- the Figma layout. Sizes scale by DS (the design fits the screen);
  // positions are measured from the edge each piece hugs, so on another
  // screen shape every piece stays against its own edge / the centre.
  const DS = Math.min(w / DESIGN.w, h / DESIGN.h);
  const L = (x: number) => x * DS; // from the left edge
  const R = (x: number) => w - (DESIGN.w - x) * DS; // from the right edge
  const C = (x: number) => w / 2 + (x - DESIGN.w / 2) * DS; // from the centre
  const T = (y: number) => y * DS; // from the top edge
  const B = (y: number) => h - (DESIGN.h - y) * DS; // from the bottom edge
  type Piece = { src: string; x: number; y: number; w: number; h: number; rotate?: number; shadow?: string; flip?: boolean };
  // exported layers (clouds, plant) already carry their rotation, flip and
  // shadow; their box is the layer's export bounds in design units
  const pieces: Piece[] = [
    // red flower plant (40% opacity is baked in): bottom centre, and the same turned upside down at the top centre
    { src: "loader-flower-plant.webp", x: C(262), y: B(645), w: 917, h: 379 },
    { src: "loader-flower-plant.webp", x: C(262), y: T(0), w: 917, h: 379, rotate: 180 },
    { src: "loader-cloud-left.webp", x: L(-210), y: T(179), w: 551, h: 232 }, // cloud 3, half out the left side
    { src: "loader-cloud-right.webp", x: R(1036), y: T(333), w: 810, h: 415 }, // cloud 1, under Claude
    { src: "loader-cloud-bottom.webp", x: L(15), y: B(765.77), w: 742.5, h: 258.5 }, // cloud 1 again, under Ankit
    { src: "loader-cloud-top.webp", x: C(719), y: T(-56), w: 537, h: 226.5 }, // cloud 2, top
  ];
  // the flying figures (drawn over the frame, as in Figma): image size,
  // centre, Figma tilt, shadow, and where the shoulder and the pointing
  // fingertip are in the image (as fractions of its width / height)
  const ankit = { w: 701.03, h: 520.84, cx: L(-52 + 707.24 / 2), cy: B(495.61 + 529.22 / 2), rotate: -0.69, shadow: "0 4px 12px rgba(0,0,0,0.5)", shoulder: [960 / 1455, 360 / 1081], tip: [1430 / 1455, 126 / 1081] };
  const claude = { w: 683.63, h: 437.3, cx: R(718.27 + 810.44 / 2), cy: T(-40 + 718.11 / 2), rotate: -29.63, shadow: "0 4px 20px rgba(0,0,0,0.8)", shoulder: [480 / 1568, 375 / 1003], tip: [61 / 1568, 316 / 1003] };
  const r2 = (n: number) => Math.round(n * 100) / 100; // same numbers on server and client
  // the mandala, centred, its height 51% of the screen's shorter side
  const mh = Math.min(w, h) * 0.512, mw = (mh * MANDALA.w) / MANDALA.h;
  const mandala = { left: r2(w / 2 - mw / 2), top: r2(h / 2 - mh / 2), width: r2(mw), height: r2(mh) };
  const pieceImg = (p: Piece, i: number) => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative
    <img
      key={i}
      src={`/images/${p.src}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{ left: r2(p.x), top: r2(p.y), width: r2(p.w * DS), height: r2(p.h * DS), transform: p.rotate ? `rotate(${p.rotate}deg)` : undefined }}
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
    const delta = Math.atan2(h / 2 - shoulder[1], w / 2 - shoulder[0]) - Math.atan2(ay, ax);
    const angle = ((base + delta) * 180) / Math.PI;
    // the fingertip on screen: an arm's length from the shoulder, towards the centre
    const arm = Math.hypot(ax, ay), toCentre = Math.hypot(w / 2 - shoulder[0], h / 2 - shoulder[1]) || 1;
    const tipX = shoulder[0] + (arm * (w / 2 - shoulder[0])) / toCentre;
    const tipY = shoulder[1] + (arm * (h / 2 - shoulder[1])) / toCentre;
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

  // The animation: one loop moves both figures and the number until they
  // touch, then hands over to the golden sequence. The shown value eases
  // towards the real progress (never faster than FLIGHT_MIN_S for the whole
  // flight), so jumps in loading never make the figures jerk.
  useEffect(() => {
    const root = rootRef.current;
    let raf = 0, last = performance.now(), shown = 0, touched = false;

    // the loader is cut along the golden wave's ragged edge (the same
    // formula the shader draws), so the site shows inside it
    const cut = (wave: { radius: number; rag: number; time: number } | null) => {
      if (!root || !wave) return;
      const cx = w / 2, cy = h / 2, pts: string[] = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2, r = Math.max(0, wave.radius + wave.rag * waveEdge(a, wave.time));
        pts.push(`${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`);
      }
      root.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${pts.join("L")}Z")`;
    };
    // the mandala lights up for a moment as the energy passes through it
    const mandalaGlow = (g: number) => {
      for (const el of [mandalaImgRef.current, mandalaLineRef.current]) {
        if (!el) continue;
        el.style.opacity = String(r2(0.3 + 0.6 * g));
        el.style.filter = g > 0.01 ? `brightness(${r2(1 + 0.9 * g)}) drop-shadow(0 0 ${r2(14 * g)}px rgba(242, 181, 68, ${r2(0.85 * g)}))` : "";
      }
    };
    const touch = () => {
      const hooks = {
        cut,
        mandala: mandalaGlow,
        onReveal: () => cbRef.current.onReveal?.(),
        onDone: () => cbRef.current.onDone?.(),
      };
      const els = {
        box: boxRef.current, litWrap: litWrapRef.current, litInner: litInnerRef.current, litLine: litLineRef.current,
        pulse: pulseRef.current, wave: ringRef.current,
      };
      if (reveal === "mandala" && root && els.box && els.litWrap && els.litInner && els.litLine && els.pulse && els.wave) {
        const fade = [ankitRef.current, claudeRef.current, statusRef.current].filter((e): e is HTMLImageElement | HTMLDivElement => !!e);
        playMandalaReveal({ root, box: els.box, litWrap: els.litWrap, litInner: els.litInner, litLine: els.litLine, pulse: els.pulse, wave: els.wave, fade }, gsap, hooks, isReducedMotion());
        return;
      }
      if (reveal === "golden" && fx.current) {
        fx.current.play(hooks);
        return;
      }
      // no WebGL: a plain fade instead
      hooks.onReveal();
      if (root) gsap.to(root, { opacity: 0, duration: 0.6, ease: "power1.inOut", onComplete: hooks.onDone });
      else hooks.onDone();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = Math.min(100, Math.max(0, targetRef.current ?? 0));
      if (target > shown) shown = Math.min(target, shown + Math.min((target - shown) * dt * 5 + 2 * dt, (100 / FLIGHT_MIN_S) * dt));
      if (target - shown < 0.05) shown = target;
      const reach = shown / 100;
      if (ankitRef.current) ankitRef.current.style.transform = transformAt(placed.ankit, reach);
      if (claudeRef.current) claudeRef.current.style.transform = transformAt(placed.claude, reach);
      const n = String(Math.floor(shown + 1e-6));
      if (numRef.current && numRef.current.textContent !== n) {
        numRef.current.textContent = n;
        statusRef.current?.setAttribute("aria-label", `Loading ${n}%`);
      }
      if (shown >= 100) {
        touched = true;
        touch();
        return; // the ending takes it from here
      }
      raf = requestAnimationFrame(tick);
    };
    if (!touched) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transformAt only reads r2
  }, [placed, reveal]);

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
  return (
    <>
      <div ref={rootRef} className="fixed inset-0 z-[1000] overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* corner plant panels */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: inset, top: inset, width: pw, height: ph }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: w - inset - pw, top: inset, width: pw, height: ph, transform: "scaleX(-1)" }} />
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
        {reveal === "mandala" && (
          <>
            <div ref={litWrapRef} aria-hidden="true" className="absolute inset-0" style={{ opacity: 0, transform: "scale(0.04)", maskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)", WebkitMaskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)" }}>
              <div ref={litInnerRef} className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
                <img src={`${P}mandala-lit.svg`} alt="" draggable={false} className="mandala-spin absolute inset-0 h-full w-full select-none" />
              </div>
            </div>
            <svg ref={litLineRef} aria-hidden="true" className="mandala-spin absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ opacity: 0 }}>
              <path data-draw="" d={MANDALA_EDGE} pathLength={1} fill="none" stroke="#F4C766" strokeWidth={0.005} strokeDasharray="1" strokeDashoffset="1" />
              <path data-shimmer="" d={MANDALA_EDGE} pathLength={1} fill="none" stroke="#FFE3A0" strokeWidth={0.011} strokeLinecap="round" strokeDasharray="0.05 0.95" strokeDashoffset="0" opacity={0} />
            </svg>
          </>
        )}
      </div>
      {reveal === "mandala" && (
        // the warm glow at the centre, and the golden ring that travels out
        <>
          <div ref={pulseRef} aria-hidden="true" className="pointer-events-none absolute rounded-full" style={{ left: r2(w / 2 - mh * 0.35), top: r2(h / 2 - mh * 0.35), width: r2(mh * 0.7), height: r2(mh * 0.7), opacity: 0, background: "radial-gradient(circle, rgba(255, 214, 130, 0.55) 0%, rgba(242, 181, 68, 0.28) 30%, rgba(217, 162, 58, 0.08) 58%, rgba(217, 162, 58, 0) 72%)" }} />
          <div ref={ringRef} aria-hidden="true" className="pointer-events-none absolute rounded-full" style={{ left: r2(w / 2 - Math.hypot(w, h) / 2), top: r2(h / 2 - Math.hypot(w, h) / 2), width: r2(Math.hypot(w, h)), height: r2(Math.hypot(w, h)), opacity: 0, background: "radial-gradient(circle, rgba(242, 181, 68, 0) 62%, rgba(242, 181, 68, 0.16) 80%, rgba(255, 214, 130, 0.42) 86%, rgba(242, 181, 68, 0.14) 90%, rgba(242, 181, 68, 0) 96%)" }} />
        </>
      )}
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
      {figure("/images/flying-ankit.webp", placed.ankit, ankit.shadow, ankitRef)}
      {figure("/images/flying-claude.webp", placed.claude, claude.shadow, claudeRef)}
      </div>
      {/* the golden energy sequence (goldenReveal.ts): a transparent three.js
          canvas over the loader and the site */}
      {reveal === "golden" && <canvas ref={fxRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1001] h-full w-full" />}
    </>
  );
}

