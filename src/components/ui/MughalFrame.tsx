"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PLANT, PLANT_EDGE } from "./cornerPlantEdge";

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
  // frame's lines, with the same red patterned band along their scalloped
  // edge (shaded from the panel side #710004 to the background side #A0251E,
  // gold and black lines on the background side, as on the main frame)
  const inset = t + GOLD_LINE + BLACK_LINE;
  const ps = Math.min(1, Math.max(150, w * 0.27) / PLANT.w); // plant scale
  const pw = PLANT.w * ps, ph = PLANT.h * ps;
  const r2 = (v: number) => Math.round(v * 100) / 100; // same numbers on server and browser
  const plantBands: ReactNode[] = [];
  for (const side of [1, -1] as const) {
    const cx = side === 1 ? 0 : w; // the screen corner this plant sits in
    // edge points on screen, run on a little past both ends so the band
    // tucks under the main frame
    const pts: [number, number][] = [[PLANT_EDGE[0][0], -inset / ps], ...PLANT_EDGE, [-inset / ps, PLANT_EDGE[PLANT_EDGE.length - 1][1]]].map(([x, y]) => [
      side === 1 ? inset + x * ps : w - inset - x * ps,
      inset + y * ps,
    ]);
    // unit normal at each point, pointing to the background (away from the corner)
    const normals = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      if (nx * (p[0] - cx) + ny * p[1] < 0) { nx = -nx; ny = -ny; }
      return [nx, ny] as const;
    });
    const offset = (d: number) => "M" + pts.map((p, i) => `${r2(p[0] + normals[i][0] * d)} ${r2(p[1] + normals[i][1] * d)}`).join(" L");
    const strip = (from: number, to: number, color: string, key: string) => (
      <path key={key} d={offset((from + to) / 2)} fill="none" stroke={color} strokeWidth={to - from + 0.6} strokeLinejoin="round" strokeLinecap="butt" />
    );
    // black + gold lines on the background side, then the red band in thin
    // shaded strips (panel side dark -> background side light)
    plantBands.push(strip(t / 2 + GOLD_LINE, t / 2 + GOLD_LINE + BLACK_LINE, "#000000", `k${side}`));
    plantBands.push(strip(t / 2, t / 2 + GOLD_LINE, GOLD, `g${side}`));
    const STRIPS = 8;
    for (let i = 0; i < STRIPS; i++) {
      const f = i / (STRIPS - 1);
      plantBands.push(strip(-t / 2 + (i * t) / STRIPS, -t / 2 + ((i + 1) * t) / STRIPS, mix(OUTER, INNER, f), `r${side}${i}`));
    }
    // the pattern tiles along the band's centre line, turned with it
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = seg.reduce((x, y) => x + y, 0);
    const n = Math.max(1, Math.round(total / (TILE.w * k)));
    const tw = total / n;
    for (let j = 0; j < n; j++) {
      // point and direction at arc length (j + 0.5) * tw
      let d = (j + 0.5) * tw, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const a = pts[i], b = pts[i + 1], f = seg[i] ? d / seg[i] : 0;
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      // the tile's "down" (its inner edge) should face the background
      const nb = normals[i], flip = -Math.sin(ang) * nb[0] + Math.cos(ang) * nb[1] < 0 ? -1 : 1;
      plantBands.push(
        <image
          key={`p${side}${j}`}
          href={`${P}border.svg`}
          x={r2(-tw / 2)}
          y={r2(-t / 2)}
          width={r2(tw + 1)}
          height={r2(t)}
          preserveAspectRatio="none"
          transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2((ang * 180) / Math.PI)}) scale(1 ${flip})`}
        />,
      );
    }
  }

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
      {/* corner plant panels + their patterned scalloped band */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: inset, top: inset, width: pw, height: ph }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/corner-plant.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute select-none" style={{ left: w - inset - pw, top: inset, width: pw, height: ph, transform: "scaleX(-1)" }} />
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-0 block" aria-hidden="true">
        {/* kept inside the main frame's lines, so the ends tuck under it */}
        <clipPath id="plant-band-clip">
          <rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} />
        </clipPath>
        <g clipPath="url(#plant-band-clip)">{plantBands}</g>
      </svg>
      {corner(0, 0, "none")}
      {corner(w - cw, 0, "scaleX(-1)")}
      {corner(0, h - ch, "scaleY(-1)")}
      {corner(w - cw, h - ch, "scale(-1, -1)")}
    </div>
  );
}

// blend two #rrggbb colours (f = 0 -> a, 1 -> b)
function mix(a: string, b: string, f: number) {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * f).toString(16).padStart(2, "0")).join("");
}
