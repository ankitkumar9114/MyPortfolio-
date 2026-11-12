"use client";

import { useEffect, useState, type ReactNode } from "react";

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
      {corner(0, 0, "none")}
      {corner(w - cw, 0, "scaleX(-1)")}
      {corner(0, h - ch, "scaleY(-1)")}
      {corner(w - cw, h - ch, "scale(-1, -1)")}
    </div>
  );
}
