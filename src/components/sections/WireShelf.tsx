"use client";

import { useState, type CSSProperties } from "react";

// Wire grid shelf (memo board) on the pink panel, replacing the unrolling
// chatai. The shelf is the steel grid image with a fairy-light string whose
// bulbs blink in a looping Christmas pattern, with photos clipped on top with
// binder clips. No scroll animation.
//
// To add a photo, set `src` on an entry in PHOTOS (put the file in
// public/images/shelf/). Positions and sizes are in grid cells: `col`/`row`
// are the top-left cell (fractions are fine), `w`/`h` the size. The image's
// grid is about 19 x 10.5 cells, starting at GRID_X0/GRID_Y0 (measured in
// image pixels from its wires).

// The shelf image (raw-images/grid shelf 2.png) has an unlit fairy-light
// string; glowing bulbs are drawn over it at BULBS (the centers of the
// string's own beads, detected in the image and sorted round the frame) and
// dealt into LIGHT_GROUPS groups in turn, which blink in LIGHT_MODES.
const SHELF_SRC = "/images/grid-shelf-3.webp";
const LIGHT_GROUPS = 4;
const IMG_W = 1559;
const IMG_H = 884;
// first inner wires at x=102 / y=96, last at x=1457 / y=845 (18 / 10 cells apart)
const CELL_W = (1457 - 102) / 18;
const CELL_H = (845 - 96) / 10;
const GRID_X0 = 102 - CELL_W;
const GRID_Y0 = 96 - CELL_H;
const BULBS: readonly (readonly [number, number])[] = [[10, 433], [51, 386], [67, 348], [74, 312], [68, 281], [45, 235], [11, 199], [52, 150], [65, 123], [72, 89], [132, 60], [169, 62], [223, 43], [281, 62], [341, 74], [384, 57], [422, 45], [462, 63], [497, 75], [524, 76], [589, 48], [626, 42], [643, 8], [679, 61], [720, 66], [765, 49], [804, 48], [867, 69], [910, 66], [948, 47], [1039, 73], [1077, 76], [1127, 53], [1149, 42], [1206, 61], [1265, 61], [1301, 48], [1330, 41], [1349, 51], [1396, 70], [1447, 64], [1484, 92], [1488, 137], [1541, 143], [1512, 198], [1512, 242], [1491, 280], [1482, 309], [1502, 367], [1545, 409], [1505, 447], [1488, 507], [1499, 536], [1509, 591], [1488, 668], [1502, 721], [1544, 749], [1503, 788], [1486, 805], [1427, 866], [1330, 810], [1329, 827], [1300, 835], [1229, 872], [1167, 816], [1147, 821], [1050, 866], [965, 818], [859, 868], [791, 811], [758, 834], [709, 867], [650, 860], [587, 816], [470, 855], [418, 816], [392, 828], [287, 865], [266, 835], [225, 817], [190, 834], [125, 864], [75, 803], [46, 767], [48, 726], [68, 666], [11, 606], [42, 586], [52, 537], [68, 505], [50, 452]];

type Photo = {
  src?: string; // leave empty for a placeholder
  alt?: string;
  col: number;
  row: number;
  w: number;
  h: number;
  tilt?: number; // degrees
  clips?: number[]; // clip positions across the top, 0..1 (default: one in the middle)
  border?: boolean; // white print border (default true)
};

// Empty for now: add entries like
//   { src: "/images/shelf/trip.webp", alt: "Goa trip", col: 1.1, row: 1, w: 3.3, h: 4.3, tilt: -0.6 },
const PHOTOS: Photo[] = [];

// Christmas light modes, like a real fairy-light controller: the controller
// button steps through them, and each loops until it's pressed again. Each
// step holds an opacity per group for `dur` seconds (with a quick FADE into
// the next step); `smooth` steps glide straight to the next value instead.
// Compiled to one @keyframes per mode per group; `null` means steady on.
type LightStep = { dur: number; on: (g: number) => number; smooth?: boolean };
const FADE = 0.06;
const rep = (n: number, f: (i: number) => LightStep[]) => Array.from({ length: n }, (_, i) => f(i)).flat();
const wave = (n: number, dur: number, f: (t: number, g: number) => number) =>
  rep(n, (i) => [{ dur, smooth: true, on: (g) => f(i / n, g) }]);
const LIGHT_MODES: { name: string; steps: LightStep[] | null }[] = [
  {
    name: "Combination",
    steps: [
      ...rep(16, (i) => [{ dur: 0.2, on: (g) => (g === i % LIGHT_GROUPS ? 1 : 0) }]),
      ...rep(8, (i) => [{ dur: 0.42, on: (g) => (g % 2 === i % 2 ? 1 : 0) }]),
      ...rep(8, (i) => [{ dur: 0.16, on: () => (i % 2 ? 0 : 1) }]),
      { dur: 1.2, on: () => 1 },
      ...wave(24, 0.12, (t, g) => 0.55 + 0.45 * Math.cos(t * 4 * Math.PI + (g * Math.PI) / 2)),
      ...rep(4, (i) => [{ dur: 0.35, on: (g) => (g <= i ? 1 : 0) }]),
      { dur: 0.8, on: () => 1 },
      { dur: 0.35, on: () => 0 },
      { dur: 1.4, on: () => 1 },
    ],
  },
  { name: "In waves", steps: wave(32, 0.1, (t, g) => 0.5 + 0.5 * Math.cos(t * 2 * Math.PI + (g * Math.PI) / 2)) },
  { name: "Sequential", steps: rep(LIGHT_GROUPS, (i) => [{ dur: 0.3, on: (g) => (g === i ? 1 : 0.08) }]) },
  { name: "Slo-glo", steps: wave(30, 0.12, (t) => 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(t * 2 * Math.PI))) },
  { name: "Chasing", steps: rep(2, (i) => [{ dur: 0.5, on: (g) => (g % 2 === i ? 1 : 0.1) }]) },
  { name: "Slow fade", steps: wave(40, 0.12, (t, g) => Math.max(0, Math.cos(t * 2 * Math.PI - (g * Math.PI) / 2))) },
  { name: "Twinkle", steps: rep(6, (i) => [{ dur: 0.14, on: (g) => ((i + g) % 3 ? 1 : 0) }]) },
  { name: "Steady on", steps: null },
];
const LIGHT_SHOW_CSS = (() => {
  let css = "";
  LIGHT_MODES.forEach(({ steps }, m) => {
    if (!steps) return;
    const total = steps.reduce((t, st) => t + st.dur, 0);
    const pc = (t: number) => `${((t / total) * 100).toFixed(3)}%`;
    for (let g = 0; g < LIGHT_GROUPS; g++) {
      let t = 0;
      const frames: string[] = [];
      for (const st of steps) {
        const v = st.on(g).toFixed(3);
        frames.push(`${pc(t)}{opacity:${v}}`);
        if (!st.smooth) frames.push(`${pc(t + st.dur - FADE)}{opacity:${v}}`);
        t += st.dur;
      }
      frames.push(`100%{opacity:${steps[0].on(g).toFixed(3)}}`);
      css += `@keyframes shelf-m${m}-g${g}{${frames.join("")}}.shelf-mode-${m} .shelf-lights-${g}{animation:shelf-m${m}-g${g} ${total.toFixed(2)}s linear infinite}`;
    }
  });
  return `${css}.shelf-lights{will-change:opacity}@media (prefers-reduced-motion: reduce){.shelf-lights{animation:none!important;opacity:1}}`;
})();

// Small square fairy-light remote hanging off the right side of the frame:
// the box is centered at x with its top at y (shelf-image pixels), w is its
// width, and its cable hangs from the nearest right-side bead above it.
const CONTROLLER = { x: 1612, y: 300, w: 62 };
const CONTROLLER_ATTACH = BULBS.filter(([x, y]) => x > IMG_W - 80 && y < CONTROLLER.y).reduce((a, b) => {
  const d = ([x, y]: readonly [number, number]) => Math.hypot(x - CONTROLLER.x, y - CONTROLLER.y);
  return d(b) < d(a) ? b : a;
});

// Soft plastic click for the controller button (Web Audio, silent until the
// visitor has interacted with the page, which pressing the button is).
let clickCtx: AudioContext | null = null;
function playClick() {
  try {
    clickCtx ??= new AudioContext();
    const ac = clickCtx;
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * 0.03);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 1.2;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, t);
    src.connect(bp).connect(gain).connect(ac.destination);
    src.start(t);
  } catch {
    // no audio available
  }
}

function LightController({ mode, onPress }: { mode: number; onPress: () => void }) {
  const [x0, y0] = CONTROLLER_ATTACH;
  const bw = (CONTROLLER.w / IMG_W) * 100; // box width in cqw
  return (
    <>
      {/* cable from the string down to the box */}
      <svg viewBox={`0 0 ${IMG_W} ${IMG_H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <path
          d={`M${x0} ${y0} C${x0 + 18} ${y0 + 10}, ${CONTROLLER.x} ${CONTROLLER.y - 30}, ${CONTROLLER.x} ${CONTROLLER.y + 2}`}
          fill="none"
          stroke="#2B2416"
          strokeWidth={2.6}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(1px 2px 1.5px rgba(20,0,6,0.5))" }}
        />
        {/* crayon "remote" label above the box, with a little arrow curling
            down to it (same hand-drawn look as the TV's "controller" note);
            kept above rather than beside the box, which sits near the
            right edge of the page */}
        <defs>
          <filter id="shelf-crayon" x="-20%" y="-40%" width="140%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="wobble" />
            <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="9" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.75" result="mask" />
            <feComposite in="rough" in2="mask" operator="in" />
          </filter>
        </defs>
        <g filter="url(#shelf-crayon)" fill="#F3EBDA" stroke="#F3EBDA" opacity={0.95}>
          <text
            x={CONTROLLER.x + 2}
            y={CONTROLLER.y - 44}
            textAnchor="middle"
            fontSize={42}
            strokeWidth={1.6}
            transform={`rotate(-5 ${CONTROLLER.x + 2} ${CONTROLLER.y - 56})`}
            style={{ fontFamily: "var(--font-caveat), cursive", fontWeight: 700, letterSpacing: "1px" }}
          >
            remote
          </text>
          <path
            d={`M${CONTROLLER.x + 44} ${CONTROLLER.y - 36} C ${CONTROLLER.x + 52} ${CONTROLLER.y - 26}, ${CONTROLLER.x + 46} ${CONTROLLER.y - 12}, ${CONTROLLER.x + 33} ${CONTROLLER.y - 6}`}
            fill="none"
            strokeWidth={3.6}
            strokeLinecap="round"
          />
          <path
            d={`M${CONTROLLER.x + 41} ${CONTROLLER.y - 3} L ${CONTROLLER.x + 32} ${CONTROLLER.y - 6} L ${CONTROLLER.x + 36} ${CONTROLLER.y - 14}`}
            fill="none"
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <div
        className="absolute"
        style={{
          left: pct(CONTROLLER.x, IMG_W),
          top: pct(CONTROLLER.y, IMG_H),
          width: `${bw}cqw`,
          translate: "-50% 0",
          rotate: "4deg",
          transformOrigin: "50% 0",
        }}
      >
        {/* strain relief where the cable enters */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: `-${bw * 0.07}cqw`, width: `${bw * 0.11}cqw`, height: `${bw * 0.1}cqw`, borderRadius: `${bw * 0.03}cqw ${bw * 0.03}cqw 0 0`, background: "linear-gradient(90deg,#151515,#3a3a3a 45%,#151515)" }}
        />
        <button
          type="button"
          onClick={() => {
            playClick();
            onPress();
          }}
          aria-label={`Change fairy light pattern (now: ${LIGHT_MODES[mode].name}, ${mode + 1} of ${LIGHT_MODES.length})`}
          title={`Light mode: ${LIGHT_MODES[mode].name}`}
          className="group relative block w-full cursor-pointer outline-none"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* body: matte black plastic, lit from the top-left */}
          <span
            className="absolute inset-0"
            style={{
              borderRadius: `${bw * 0.09}cqw`,
              background: "linear-gradient(160deg, #4a4a4f 0%, #2a2a2e 38%, #18181b 70%, #0e0e10 100%)",
              boxShadow: [
                `inset ${bw * 0.012}cqw ${bw * 0.016}cqw 0 rgba(255,255,255,0.16)`,
                `inset -${bw * 0.012}cqw -${bw * 0.02}cqw ${bw * 0.02}cqw rgba(0,0,0,0.7)`,
                `${bw * 0.03}cqw ${bw * 0.07}cqw ${bw * 0.06}cqw rgba(20,0,6,0.55)`,
                `${bw * 0.08}cqw ${bw * 0.16}cqw ${bw * 0.2}cqw rgba(20,0,6,0.35)`,
              ].join(","),
            }}
          />
          {/* glossy sheen */}
          <span
            className="pointer-events-none absolute"
            style={{ inset: `${bw * 0.02}cqw`, borderRadius: `${bw * 0.08}cqw`, background: "linear-gradient(170deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0) 55%)" }}
          />
          {/* mode LED, flashes on each press */}
          <span
            key={mode}
            className="shelf-ctrl-led pointer-events-none absolute rounded-full"
            style={{ left: "12%", top: "12%", width: `${bw * 0.09}cqw`, height: `${bw * 0.09}cqw`, background: "radial-gradient(circle at 35% 35%, #fff8d8, #ffc24a 55%, #c27a12)", boxShadow: `0 0 ${bw * 0.05}cqw ${bw * 0.015}cqw rgba(255,190,70,0.85)` }}
          />
          {/* the button: domed black, presses in */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full transition-[translate,box-shadow] duration-75 group-active:translate-y-[0.05cqw]"
            style={{
              width: `${bw * 0.52}cqw`,
              height: `${bw * 0.52}cqw`,
              margin: `-${bw * 0.26}cqw 0 0 -${bw * 0.26}cqw`,
              background: "radial-gradient(circle at 34% 28%, #6a6a70 0%, #2c2c30 32%, #121214 70%, #050506 100%)",
              boxShadow: [
                `0 0 0 ${bw * 0.025}cqw #050506`,
                `0 0 0 ${bw * 0.04}cqw rgba(255,255,255,0.07)`,
                `${bw * 0.02}cqw ${bw * 0.04}cqw ${bw * 0.04}cqw rgba(0,0,0,0.7)`,
                `inset 0 ${bw * 0.015}cqw ${bw * 0.01}cqw rgba(255,255,255,0.18)`,
              ].join(","),
            }}
          />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-amber-200/70 group-focus-visible:ring-2" style={{ borderRadius: `${bw * 0.09}cqw` }} />
        </button>
      </div>
    </>
  );
}



const pct = (v: number, of: number) => `${(v / of) * 100}%`;

// Decorations on the shelf, in front of the lights and photos, placed after
// the moodboard reference (vine wrapping the top-left corner, bouquet hanging
// off the left edge past the bottom rail, money plant in a wire basket lower
// right, kraft notes and a purple bouquet). Position (top-left) and width in shelf-image pixels; tune them live
// with the dev-only "Shelf decor" panel, then copy the numbers here.
type Decor = { label: string; src: string; x: number; y: number; w: number; z?: number }; // z: stacking (default 30)
// Realistic shadow for everything hung on the shelf, lit from the top-left:
// a tight contact shadow where the item meets the grid, plus a soft, wider
// cast shadow falling down-right. Sized in cqw (shelf width) so it scales.
const DECOR_SHADOW = [
  "drop-shadow(0.08cqw 0.16cqw 0.1cqw rgba(20, 0, 6, 0.6))",
  "drop-shadow(0.5cqw 1cqw 0.8cqw rgba(20, 0, 6, 0.5))",
  "drop-shadow(1cqw 2.2cqw 2.4cqw rgba(20, 0, 6, 0.32))",
].join(" ");

const DECOR: Decor[] = [
  // photos and notes first, then the bouquets and plants that overlap them
  { label: "Birthday photo", src: "/images/shelf-photo-birthday-r3.webp", x: 115, y: 57, w: 197 },
  { label: "Same Energy note", src: "/images/shelf-note-same-energy-r2.webp", x: 370, y: 58, w: 167 },
  { label: "Leaf note", src: "/images/shelf-note-leaf-r2.webp", x: 115, y: 339, w: 185 },
  { label: "Jatayu photo", src: "/images/shelf-photo-jatayu-r2.webp", x: 335, y: 298, w: 279 },
  { label: "Something Something photo", src: "/images/shelf-photo-something-r2.webp", x: 82, y: 592, w: 317 },
  { label: "Checklist note", src: "/images/shelf-note-checklist-r2.webp", x: 377, y: 571, w: 235 },
  { label: "Go Goa Gone photo", src: "/images/shelf-photo-goa-r2.webp", x: 607, y: 542, w: 285 },
  { label: "What a view photo", src: "/images/shelf-photo-what-a-view-r2.webp", x: 637, y: 18, w: 211 },
  { label: "Jai mata di photo", src: "/images/shelf-photo-jai-mata-di-r2.webp", x: 1056, y: 59, w: 213 },
  { label: "Progress note", src: "/images/shelf-note-progress-r2.webp", x: 1303, y: 136, w: 120 },
  { label: "Good Girl photo", src: "/images/shelf-photo-good-girl-r2.webp", x: 976, y: 372, w: 221 },
  { label: "Sea photo", src: "/images/shelf-photo-sea-r2.webp", x: 1190, y: 359, w: 350 },
  { label: "Flower sketch note", src: "/images/shelf-note-flower-r2.webp", x: 1308, y: 617, w: 126 },
  { label: "Purple bouquet", src: "/images/shelf-bouquet-purple-r2.webp", x: 750, y: 82, w: 440 },
  { label: "Top-left vine", src: "/images/shelf-plant-top-left-r2.webp", x: -33, y: -32, w: 453 },
  { label: "Bottom-left bouquet", src: "/images/shelf-bouquet-bottom-left-r2.webp", x: -177, y: 502, w: 402 },
  { label: "Bottom-right vine", src: "/images/shelf-plant-bottom-right-r2.webp", x: 1066, y: 423, w: 540, z: 40 },
  { label: "Money plant basket", src: "/images/shelf-money-plant-basket-r2.webp", x: 873, y: 574, w: 411 },
];

export default function WireShelf({ style }: { style?: CSSProperties }) {
  // Only the dev panel's slider changes live in state (by label); the rest
  // comes straight from DECOR, so edited defaults show on hot reload.
  const [tweaks, setTweaks] = useState<Record<string, Partial<Decor>>>({});
  const decor = DECOR.map((d) => ({ ...d, ...tweaks[d.label] }));
  const [mode, setMode] = useState(0); // fairy-light mode, changed by the controller
  return (
    <div className="relative mx-auto w-[90%] max-w-[1382px]" style={style}>
      <div className={`shelf-mode-${mode} relative w-full [container-type:inline-size]`} style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}>
        <style>{LIGHT_SHOW_CSS}</style>
        {/* the remote sits behind the shelf wires (painted first); the shelf
            image and lights are pointer-events-none, so it stays clickable */}
        <LightController mode={mode} onPress={() => setMode((m) => (m + 1) % LIGHT_MODES.length)} />
        {/* eslint-disable-next-line @next/next/no-img-element -- transparent decorative raster, sized by its container */}
        <img src={SHELF_SRC} alt="" aria-hidden="true" width={IMG_W} height={IMG_H} loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
        <svg viewBox={`0 0 ${IMG_W} ${IMG_H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <radialGradient id="shelf-bulb-glow">
              <stop offset="0%" stopColor="#FFE9A8" stopOpacity="1" />
              <stop offset="22%" stopColor="#FFC45C" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#FF9A2E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#FF9A2E" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="shelf-bulb-core">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FFF2C2" />
              <stop offset="100%" stopColor="#FFC85A" />
            </radialGradient>
          </defs>
          {Array.from({ length: LIGHT_GROUPS }, (_, g) => (
            <g key={g} className={`shelf-lights shelf-lights-${g}`}>
              {BULBS.filter((_, k) => k % LIGHT_GROUPS === g).map(([x, y]) => (
                <g key={`${x},${y}`}>
                  <circle cx={x} cy={y} r={24} fill="url(#shelf-bulb-glow)" style={{ mixBlendMode: "screen" }} />
                  <circle cx={x} cy={y} r={5.2} fill="url(#shelf-bulb-core)" />
                </g>
              ))}
            </g>
          ))}
        </svg>

        {PHOTOS.map((p, i) => (
          <ClippedPhoto key={i} photo={p} />
        ))}

        {decor.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element -- transparent decorative raster positioned in shelf units
          <img
            key={d.src}
            src={d.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute h-auto max-w-none select-none"
            style={{
              left: pct(d.x, IMG_W),
              top: pct(d.y, IMG_H),
              width: pct(d.w, IMG_W),
              zIndex: d.z ?? 30,
              filter: DECOR_SHADOW,
            }}
          />
        ))}
      </div>
      {process.env.NODE_ENV === "development" && <DecorTuner decor={decor} tweaks={tweaks} onChange={setTweaks} />}
    </div>
  );
}

// Dev-only panel to place the shelf decorations (never in a production build).
function DecorTuner({
  decor,
  tweaks,
  onChange,
}: {
  decor: Decor[];
  tweaks: Record<string, Partial<Decor>>;
  onChange: (t: Record<string, Partial<Decor>>) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-[2000] hidden rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg desktop:block"
        style={{ cursor: "pointer" }}
      >
        Shelf decor
      </button>
    );
  }
  const rows = [
    ["Left / right", "x", -400, IMG_W, 1],
    ["Up / down", "y", -300, IMG_H + 100, 1],
    ["Size (width)", "w", 80, 1000, 1],
  ] as const;
  return (
    <div className="fixed right-4 top-24 z-[2000] hidden max-h-[calc(100vh-7rem)] w-[260px] overflow-y-auto rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur desktop:block">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Shelf decor (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>
      {decor.map((d) => (
        <div key={d.src} className="mb-3">
          <div className="mb-1 font-semibold">{d.label}</div>
          {rows.map(([name, k, min, max, step]) => (
            <div key={k}>
              <label className="mt-1 flex justify-between">
                <span>{name}</span>
                <span className="tabular-nums">{d[k]}</span>
              </label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={d[k]}
                onChange={(e) => onChange({ ...tweaks, [d.label]: { ...tweaks[d.label], [k]: Number(e.target.value) } })}
                className="w-full"
                style={{ cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({})}
        className="mt-1 rounded bg-white/15 px-2 py-1 hover:bg-white/25"
        style={{ cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
}

function ClippedPhoto({ photo }: { photo: Photo }) {
  const { src, alt = "", col, row, w, h, tilt = 0, clips = [0.5], border = true } = photo;
  return (
    <div
      className="absolute"
      style={{
        left: pct(GRID_X0 + col * CELL_W, IMG_W),
        top: pct(GRID_Y0 + row * CELL_H, IMG_H),
        width: pct(w * CELL_W, IMG_W),
        height: pct(h * CELL_H, IMG_H),
        rotate: `${tilt}deg`,
        transformOrigin: "50% 0",
        filter: "drop-shadow(3px 6px 5px rgba(58, 0, 20, 0.35))",
      }}
    >
      <div className="h-full w-full bg-[#FBFAF7]" style={{ padding: border ? "5%" : 0 }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- user photos at arbitrary sizes, cropped by object-fit
          <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#E4E0D8]">
            <svg viewBox="0 0 24 24" className="h-[22%] w-[22%] opacity-40" fill="none" stroke="#6B6459" strokeWidth={1.5} aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 17l-5.5-5.5L5 20" />
            </svg>
          </div>
        )}
      </div>
      {clips.map((c) => (
        <BinderClip key={c} at={c} />
      ))}
    </div>
  );
}

// Black binder clip biting the top edge, with its two metal handles folded up.
function BinderClip({ at }: { at: number }) {
  return (
    <svg
      viewBox="0 0 40 44"
      className="absolute"
      style={{ left: `${at * 100}%`, top: 0, width: "clamp(14px, 2.2vw, 28px)", translate: "-50% -58%" }}
      aria-hidden="true"
    >
      <path d="M12 22 C10 8 13 2 16 2 M28 22 C30 8 27 2 24 2" fill="none" stroke="#B9B9B9" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M16 2 H24" stroke="#B9B9B9" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M6 20 H34 L31 40 H9 Z" fill="#141414" />
      <path d="M8 22 H32" stroke="#3A3A3A" strokeWidth={1.5} />
    </svg>
  );
}
