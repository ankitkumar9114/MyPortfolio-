"use client";

import { useEffect, useMemo, useState } from "react";

// Mughal-miniature style frame for the new loader (border only, for now):
// the teal textured background (loader-bg-teal.webp) inside an SVG border
// inspired by the "creation" painting — a rust band with gold motifs and gold
// lines, cream corner panels with lotus vines, a cusped (scalloped) arch with
// a gold dotted edge, and a lotus medallion on the bottom band. Drawn in
// screen pixels and rebuilt for the window's size, so nothing stretches.

const RUST = "#8E2B1E";
const RUST_DARK = "#6E1E14";
const GOLD = "#D9A441";
const GOLD_LIGHT = "#F0C66A";
const CREAM = "#F2DDB1";
const CREAM_DARK = "#E4C690";
const LEAF = "#3F6E5C";
const FLOWER = "#B8381F";

// 2 decimals, so server and browser render identical numbers
const n = (v: number) => Math.round(v * 100) / 100;

type Pt = [number, number];

// a cusped arch: left side -> apex -> right side, as Q segments
function arch(w: number, h: number, inset: number) {
  const L = inset, cx = w / 2;
  const top = inset + Math.max(40, h * 0.06);
  const base = inset + Math.min(h * 0.42, w * 0.32);
  const lobes = Math.max(4, Math.round((cx - L) / 150));
  const curve = (t: number): Pt => [L + (cx - L) * (1 - Math.cos((t * Math.PI) / 2)), base - (base - top) * Math.sin((t * Math.PI) / 2)];
  const depth = Math.min(26, (cx - L) / lobes / 4);
  const segs: { c: Pt; e: Pt }[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = curve(i / lobes), b = curve((i + 1) / lobes);
    // each lobe bulges outward (away from the opening): the segment's
    // normal (-dy, dx) points inward, so step against it
    const nx = -(b[1] - a[1]), ny = b[0] - a[0], len = Math.hypot(nx, ny) || 1;
    segs.push({ c: [(a[0] + b[0]) / 2 - (nx / len) * depth * 2, (a[1] + b[1]) / 2 - (ny / len) * depth * 2], e: b });
  }
  const start: Pt = [L, base];
  const mirror = (p: Pt): Pt => [w - p[0], p[1]];
  // right half: mirrored, walked from the apex back down
  const right: { c: Pt; e: Pt }[] = [];
  for (let i = segs.length - 1; i >= 0; i--) right.push({ c: mirror(segs[i].c), e: mirror(i === 0 ? start : segs[i - 1].e) });
  const q = (s: { c: Pt; e: Pt }) => ` Q ${n(s.c[0])} ${n(s.c[1])} ${n(s.e[0])} ${n(s.e[1])}`;
  const d = `M ${n(start[0])} ${n(start[1])}${segs.map(q).join("")}${right.map(q).join("")}`;
  return { d, base, cx };
}

function Lotus({ x, y, s, color = FLOWER }: { x: number; y: number; s: number; color?: string }) {
  const petal = "M0 0 C 6 -10 6 -26 0 -34 C -6 -26 -6 -10 0 0 Z";
  return (
    <g transform={`translate(${n(x)} ${n(y)}) scale(${n(s / 34)})`}>
      {[-58, -30, 30, 58].map((r) => (
        <path key={r} d={petal} transform={`rotate(${r})`} fill={color} opacity={0.85} stroke={RUST_DARK} strokeWidth={1.2} />
      ))}
      <path d={petal} fill={color} stroke={RUST_DARK} strokeWidth={1.2} />
      <ellipse cx={0} cy={2} rx={14} ry={4} fill={GOLD} />
    </g>
  );
}

// a vine with leaves and small flowers along a quadratic curve
function Vine({ from, ctrl, to, leaves, flip = false }: { from: Pt; ctrl: Pt; to: Pt; leaves: number; flip?: boolean }) {
  const items = [];
  for (let i = 1; i <= leaves; i++) {
    const t = i / (leaves + 1);
    const x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * to[0];
    const y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * to[1];
    const dx = 2 * (1 - t) * (ctrl[0] - from[0]) + 2 * t * (to[0] - ctrl[0]);
    const dy = 2 * (1 - t) * (ctrl[1] - from[1]) + 2 * t * (to[1] - ctrl[1]);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const side = (i % 2 === 0) !== flip ? 1 : -1;
    items.push(<ellipse key={`l${i}`} rx={11} ry={4.5} fill={LEAF} transform={`translate(${n(x)} ${n(y)}) rotate(${n(a + side * 40)}) translate(11 0)`} />);
    if (i % 3 === 0) items.push(<circle key={`f${i}`} cx={n(x)} cy={n(y)} r={4} fill={FLOWER} stroke={GOLD} strokeWidth={1} />);
  }
  return (
    <g>
      <path d={`M ${n(from[0])} ${n(from[1])} Q ${n(ctrl[0])} ${n(ctrl[1])} ${n(to[0])} ${n(to[1])}`} fill="none" stroke={LEAF} strokeWidth={2} />
      {items}
    </g>
  );
}

export default function MughalFrame() {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const g = useMemo(() => {
    const { w, h } = size;
    const phone = w < 600;
    const m = phone ? 6 : 10; // outer margin
    const band = phone ? 16 : 24; // rust band thickness
    const inner = m + band + 4; // inside edge of the band
    const a = arch(w, h, inner);
    // cream panels: the top of the inner area minus the arch opening
    const spandrel = `M ${inner} ${inner} L ${w - inner} ${inner} L ${w - inner} ${n(a.base)} L ${inner} ${n(a.base)} Z ${a.d} Z`;
    return { w, h, phone, m, band, inner, a, spandrel };
  }, [size]);

  const { w, h, phone, m, band, inner, a, spandrel } = g;
  const cx = w / 2;
  const med = phone ? 44 : 70;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 block" aria-hidden="true">
        <defs>
          {/* rust band: small gold diamonds and cream dots */}
          <pattern id="mughal-band" width={22} height={band} patternUnits="userSpaceOnUse">
            <rect width={22} height={band} fill={RUST} />
            <path d={`M 11 ${band / 2 - 5} L 15 ${band / 2} L 11 ${band / 2 + 5} L 7 ${band / 2} Z`} fill={GOLD} />
            <circle cx={1} cy={band / 2} r={1.6} fill={CREAM} />
          </pattern>
          <pattern id="mughal-band-v" width={band} height={22} patternUnits="userSpaceOnUse">
            <rect width={band} height={22} fill={RUST} />
            <path d={`M ${band / 2 - 5} 11 L ${band / 2} 15 L ${band / 2 + 5} 11 L ${band / 2} 7 Z`} fill={GOLD} />
            <circle cx={band / 2} cy={1} r={1.6} fill={CREAM} />
          </pattern>
          <clipPath id="mughal-spandrel">
            <path d={spandrel} clipRule="evenodd" />
          </clipPath>
        </defs>

        {/* cream corner panels above the arch, with lotus vines */}
        <path d={spandrel} fill={CREAM} fillRule="evenodd" />
        <g clipPath="url(#mughal-spandrel)">
          <path d={spandrel} fill="none" stroke={CREAM_DARK} strokeWidth={14} opacity={0.6} />
          <Lotus x={inner + (phone ? 34 : 70)} y={inner + (phone ? 44 : 78)} s={phone ? 22 : 40} />
          <Lotus x={w - inner - (phone ? 34 : 70)} y={inner + (phone ? 44 : 78)} s={phone ? 22 : 40} />
          <Vine from={[inner + 20, a.base - 30]} ctrl={[inner + 40, inner + 40]} to={[cx * 0.62, inner + 18]} leaves={phone ? 4 : 9} />
          <Vine from={[w - inner - 20, a.base - 30]} ctrl={[w - inner - 40, inner + 40]} to={[w - cx * 0.62, inner + 18]} leaves={phone ? 4 : 9} flip />
        </g>

        {/* the cusped arch edge: gold, rust, then a dotted gold line */}
        <path d={a.d} fill="none" stroke={GOLD} strokeWidth={phone ? 8 : 12} strokeLinejoin="round" />
        <path d={a.d} fill="none" stroke={RUST} strokeWidth={phone ? 5 : 7} strokeLinejoin="round" />
        <path d={a.d} fill="none" stroke={GOLD_LIGHT} strokeWidth={2} strokeDasharray="0 7" strokeLinecap="round" />

        {/* bottom centre lotus medallion */}
        <g transform={`translate(${n(cx)} ${h - inner})`}>
          <path d={`M ${-med} 0 A ${med} ${med} 0 0 1 ${med} 0 Z`} fill={CREAM} stroke={GOLD} strokeWidth={3} />
          <path d={`M ${-med * 0.83} 0 A ${med * 0.83} ${med * 0.83} 0 0 1 ${med * 0.83} 0`} fill="none" stroke={RUST} strokeWidth={2} strokeDasharray="0 6" strokeLinecap="round" />
          <Lotus x={0} y={-6} s={phone ? 26 : 42} color="#D9822B" />
        </g>

        {/* the outer rust band with gold lines and corner blocks */}
        <rect x={m} y={m} width={w - 2 * m} height={band} fill="url(#mughal-band)" />
        <rect x={m} y={h - m - band} width={w - 2 * m} height={band} fill="url(#mughal-band)" />
        <rect x={m} y={m} width={band} height={h - 2 * m} fill="url(#mughal-band-v)" />
        <rect x={w - m - band} y={m} width={band} height={h - 2 * m} fill="url(#mughal-band-v)" />
        <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} fill="none" stroke={GOLD} strokeWidth={2} />
        <rect x={m + band} y={m + band} width={w - 2 * (m + band)} height={h - 2 * (m + band)} fill="none" stroke={GOLD} strokeWidth={2} />
        <rect x={inner} y={inner} width={w - 2 * inner} height={h - 2 * inner} fill="none" stroke={GOLD} strokeOpacity={0.6} strokeWidth={1} />
        {[[m, m], [w - m - band, m], [m, h - m - band], [w - m - band, h - m - band]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={band} height={band} fill={GOLD} stroke={RUST_DARK} strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}
