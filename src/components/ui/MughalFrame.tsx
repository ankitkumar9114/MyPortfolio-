"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PLANT } from "./cornerPlantEdge";

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
const MANDALA = { w: 3920, h: 3919 }; // mandala.svg (traced from the grey line-art reference)
const CORNER = { w: 39, h: 40 }; // top-left L, arms 18 thick
const TILE = { w: 49, h: 18 }; // band tile
const BAND = 20; // border thickness on screen (px)
const OUTER = "#710004"; // band gradient, outer edge
const INNER = "#A0251E"; // band gradient, inner edge
const GOLD = "#F6A225"; // the ornaments' gold
const GOLD_LINE = 2; // px, the inner gold line
const BLACK_LINE = GOLD_LINE; // px, the black line inside the gold one (same thickness)

export default function MughalFrame() {
  const [size, setSize] = useState({ w: 1440, h: 900 });
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
  const ankit = { w: 701.03, h: 520.84, cx: L(-52 + 707.24 / 2), cy: B(495.61 + 529.22 / 2), rotate: -0.69, shadow: "0 4px 12px rgba(0,0,0,0.5)", shoulder: [960 / 1455, 360 / 1081], tip: [1438 / 1455, 160 / 1081] };
  const claude = { w: 683.63, h: 437.3, cx: R(718.27 + 810.44 / 2), cy: T(-40 + 718.11 / 2), rotate: -29.63, shadow: "0 4px 20px rgba(0,0,0,0.8)", shoulder: [480 / 1568, 375 / 1003], tip: [52 / 1568, 374 / 1003] };
  const r2 = (n: number) => Math.round(n * 100) / 100; // same numbers on server and client
  // the mandala, centred, its height 64% of the screen's shorter side
  const mh = Math.min(w, h) * 0.64, mw = (mh * MANDALA.w) / MANDALA.h;
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
  // the pointing finger always aims at the centre of the screen.
  const figure = (src: string, f: typeof ankit) => {
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
    // rotate about the shoulder, and move it to where the Figma tilt put it
    const tx = shoulder[0] - (left + sx), ty = shoulder[1] - (top + sy);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative figure
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: r2(left),
          top: r2(top),
          width: r2(fw),
          height: r2(fh),
          transformOrigin: `${r2(sx)}px ${r2(sy)}px`,
          transform: `translate(${r2(tx)}px, ${r2(ty)}px) rotate(${r2(angle)}deg)`,
          filter: `drop-shadow(${f.shadow})`,
        }}
      />
    );
  };

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
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* corner plant panels */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: inset, top: inset, width: pw, height: ph }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: w - inset - pw, top: inset, width: pw, height: ph, transform: "scaleX(-1)" }} />
      {/* red flower plants and clouds */}
      {pieces.map(pieceImg)}
      {/* the gold mandala (traced from the line-art reference) in the centre, behind the figures' hands */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG */}
      <img src={`${P}mandala.svg`} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={mandala} />
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
      {/* flying Ankit and flying Claude, over the frame */}
      {figure("/images/flying-ankit.webp", ankit)}
      {figure("/images/flying-claude.webp", claude)}
    </div>
  );
}

