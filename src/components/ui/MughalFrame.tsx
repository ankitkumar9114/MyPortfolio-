"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PLANT } from "./cornerPlantEdge";
import { MANDALA_EDGE, MANDALA_TIPS } from "./mandalaEdge";

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
// the energy fire and the burning reveal
const FLIGHT_MIN_S = 2.6; // the figures never fly in faster than this (0 -> 100%)
const FIRE = ["255, 251, 228", "255, 222, 110", "255, 168, 40", "236, 92, 18", "160, 34, 8"]; // flame colours, hottest first
const FILL_MS = 1400; // ms for the fire to cover the page
const REVEAL_AT = 1000; // ms after the touch when the burn-away starts
const REVEAL_MS = 1700; // ms for the burnt opening to reach the corners
type Flame = { x: number; y: number; vx: number; vy: number; size: number; life: number; age: number };

// a soft round glow in one colour, drawn once and stamped for every flame
function glowSprite(rgb: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb}, 1)`);
    gr.addColorStop(0.35, `rgba(${rgb}, 0.6)`);
    gr.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  return c;
}
// a flickering, ragged edge: how far (as a fraction) the edge sticks out at
// angle a, time t
const ragged = (a: number, t: number) =>
  0.5 * Math.sin(6 * a + t * 3.1) + 0.3 * Math.sin(11 * a - t * 4.7 + 1.3) + 0.2 * Math.sin(23 * a + t * 8.3 + 2.1);

// `progress` (0-100, real loading progress from MughalLoader) drives the
// percentage and the figures' flight.
//
// At 100% the fingertips touch and golden energy fire bursts out from the
// touch and spreads over the whole page; a second in, the loader starts
// burning away from the centre outwards (a ragged, glowing edge), showing
// the site underneath. `onReveal` fires as the burn starts, `onDone` once
// the loader is gone.
export default function MughalFrame({ progress = 0, onReveal, onDone }: { progress?: number; onReveal?: () => void; onDone?: () => void }) {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const rootRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLCanvasElement>(null);
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

  // The animation: one loop moves both figures and the number, then plays
  // the energy fire and the burn-away. The shown value eases towards the
  // real progress (never faster than FLIGHT_MIN_S for the whole flight), so
  // jumps in loading never make the figures jerk.
  useEffect(() => {
    const root = rootRef.current, canvas = fireRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    if (canvas) {
      canvas.width = w;
      canvas.height = h;
    }
    const cx = w / 2, cy = h / 2;
    const far = Math.hypot(w, h) / 2; // centre to the corners
    const S = far / 900; // flame sizes and speeds are tuned for a laptop screen
    const sprites = FIRE.map(glowSprite);
    let raf = 0, last = performance.now(), shown = 0, touchAt = 0, revealed = false, finished = false;
    let flames: Flame[] = [];

    // a closed ragged circle of radius R as path points
    const edge = (R: number, rough: number, t: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const r = Math.max(0, R + rough * ragged(a, t));
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      return pts;
    };
    const trace = (pts: [number, number][]) => {
      if (!ctx) return;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    const emit = (n: number, rMin: number, rMax: number, speed: number, size: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
        const v = speed * (0.4 + Math.random() * 0.9);
        flames.push({
          x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * S, // flames lick upwards too
          size: size * (0.6 + Math.random() * 0.8),
          life: 0.45 + Math.random() * 0.6, age: 0,
        });
      }
    };

    const drawFire = (now: number, dt: number) => {
      if (!ctx) return;
      const e = (now - touchAt) / 1000, t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      // the fire front: a ragged wall of fire racing out from the touch until
      // it covers the page, white-hot behind, red at its edge
      const u = Math.min(1, (e * 1000) / FILL_MS);
      const F = (far * 1.25 + 60 * S) * (1 - Math.pow(1 - u, 3));
      if (F > 1) {
        ctx.globalCompositeOperation = "source-over";
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, F);
        g.addColorStop(0, "rgba(255, 248, 215, 0.97)");
        g.addColorStop(0.3, "rgba(255, 214, 92, 0.95)");
        g.addColorStop(0.7, "rgba(250, 146, 32, 0.93)");
        g.addColorStop(0.9, "rgba(214, 70, 14, 0.9)");
        g.addColorStop(1, "rgba(150, 32, 8, 0.75)");
        ctx.fillStyle = g;
        trace(edge(F, Math.min(F * 0.3, 70 * S), t));
        ctx.fill();
      }
      // the flames: glowing tongues burning outwards, hot white -> yellow ->
      // orange -> red as they die, flickering in size, added as light
      if (e < 1.8) emit(Math.round(900 * dt), F * 0.55, F * 1.02, 340 * S, 70 * S);
      ctx.globalCompositeOperation = "lighter";
      const drag = Math.exp(-1.2 * dt);
      flames = flames.filter((f) => (f.age += dt) < f.life);
      for (const f of flames) {
        f.vx *= drag;
        f.vy = f.vy * drag - 90 * S * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const k = f.age / f.life;
        const img = sprites[Math.min(FIRE.length - 1, Math.floor(k * FIRE.length))];
        const sz = f.size * (1 - k * 0.5) * (0.85 + Math.random() * 0.3);
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.drawImage(img, f.x - sz / 2, f.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      // the flash of the touch itself
      const fl = Math.max(0, 1 - e / 0.5);
      if (fl > 0) {
        const r = (40 + 380 * e) * S;
        ctx.globalAlpha = fl;
        ctx.drawImage(sprites[0], cx - r, cy - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    };

    // the burn-away: the loader is cut along a ragged circle that grows from
    // the centre (so the site shows inside it), and that edge glows like
    // burning paper, throwing embers
    const burn = (now: number) => {
      const e = now - touchAt - REVEAL_AT;
      const u = Math.min(1, e / REVEAL_MS);
      const rough = 34 * S;
      const H = (far + rough * 2 + 20) * (u * u * (3 - 2 * u));
      const pts = edge(H, Math.min(H * 0.35, rough), now / 1000);
      if (root) root.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L")}Z")`;
      if (ctx && H > 2) {
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "rgba(255, 120, 20, 1)";
        ctx.shadowBlur = 28 * S;
        ctx.strokeStyle = "rgba(255, 150, 40, 0.95)";
        ctx.lineWidth = 16 * S;
        trace(pts);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 245, 200, 0.9)";
        ctx.lineWidth = 4 * S;
        ctx.stroke();
        // embers flying off the burning edge
        if (u < 1) emit(14, H, H + rough, 120 * S, 26 * S);
      }
      return u >= 1;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!touchAt) {
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
          // the touch
          touchAt = now;
          emit(160, 0, 20 * S, 700 * S, 90 * S);
        }
      } else if (!finished) {
        drawFire(now, dt);
        if (now - touchAt >= REVEAL_AT) {
          if (!revealed) {
            revealed = true;
            cbRef.current.onReveal?.();
          }
          if (burn(now)) {
            finished = true;
            cbRef.current.onDone?.();
          }
        }
      }
      if (!finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transformAt only reads r2
  }, [placed]);

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
    <div ref={rootRef} className="fixed inset-0 z-[1000] overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* corner plant panels */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: inset, top: inset, width: pw, height: ph }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: w - inset - pw, top: inset, width: pw, height: ph, transform: "scaleX(-1)" }} />
      {/* red flower plants and clouds */}
      {pieces.map(pieceImg)}
      {/* the gold mandala (raw-images/mandala-lines.svg, lines in the reference painting's muted ochre) in the centre, behind the figures' hands */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
      <img src={`${P}mandala.svg`} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ ...mandala, opacity: 0.3 }} />
      {/* a dotted line hugging the mandala's own edge, a little outside it, same ochre and opacity */}
      <svg aria-hidden="true" className="pointer-events-none absolute overflow-visible" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ ...mandala, opacity: 0.3 }}>
        <path d={MANDALA_EDGE} fill="none" stroke="#B9823A" strokeWidth={0.009} strokeLinecap="round" strokeDasharray="0.0001 0.021" />
        {MANDALA_TIPS.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={0.008} fill="#B9823A" />
        ))}
      </svg>
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
      {/* the energy fire from the touch, and the burning edge of the reveal */}
      <canvas ref={fireRef} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ width: w, height: h }} />
    </div>
  );
}

