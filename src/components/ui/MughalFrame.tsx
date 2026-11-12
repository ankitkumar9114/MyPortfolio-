"use client";

import { useEffect, useState, type ReactNode } from "react";

// Frame for the new loader (border only, for now): the teal textured
// background (loader-bg-teal.webp) inside a border made of two SVGs from
// raw-images (public/graphics/loader-frame/):
//   corner.svg  - an L-shaped top-right corner (134x136, arms 54 thick),
//                 mirrored into the other three corners
//   border.svg  - a 105x54 band tile, repeated along the top and bottom;
//                 border-vertical.svg is the same tile turned 90° for the sides
// Each edge holds a whole number of tiles (stretched a hair to fit exactly),
// so a tile is never cut off at a corner. Scales with the window (k).

const P = "/graphics/loader-frame/";
const CORNER = { w: 134, h: 136 };
const TILE = { w: 105, h: 54 }; // band thickness = 54

export default function MughalFrame() {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const { w, h } = size;
  const k = Math.min(1, Math.max(0.5, w / 1440)); // full size from 1440px wide, half on phones
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
    for (const y of [0, h - t]) tiles.push(<image key={`h${i}-${y}`} href={`${P}border.svg`} x={x} y={y} width={hTile + SEAM} height={t} preserveAspectRatio="none" />);
  }
  for (let i = 0; i < vn; i++) {
    const y = ch + i * vTile;
    for (const x of [0, w - t]) tiles.push(<image key={`v${i}-${x}`} href={`${P}border-vertical.svg`} x={x} y={y} width={t} height={vTile + SEAM} preserveAspectRatio="none" />);
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
        {tiles}
      </svg>
      {corner(w - cw, 0, "none")}
      {corner(0, 0, "scaleX(-1)")}
      {corner(w - cw, h - ch, "scaleY(-1)")}
      {corner(0, h - ch, "scale(-1, -1)")}
    </div>
  );
}
