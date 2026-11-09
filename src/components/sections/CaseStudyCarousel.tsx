"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll } from "framer-motion";
import { useCaseStudies } from "@/lib/caseStudies";
import CaseStudyCard, { CARD_WIDTH, CARD_HEIGHT } from "./CaseStudyCard";

// Desktop "featured works" carousel. The section pins to the viewport and
// scrolling slides the cards sideways along a curved track: the active card
// sits flat in the center, the neighbours sit smaller on either side and
// their outer parts wrap round a curve toward the viewer, growing taller as
// they run off the screen edge, like the reference.
// After the last card reaches the center the pin releases and the page
// scrolls on to the next section.
//
// How the bend works: every card is rendered STRIPS times, each copy clipped
// to one thin vertical slice. Each slice is mapped onto the track with a
// perspective transform (matrix3d) whose left/right edges can have different
// heights, so the slices together draw the smooth curved outline while the
// card's own HTML stays crisp.


// Soft two-layer shadow lifting the cards off the wall: a tight contact
// shadow plus a wide, soft one falling downward.
export const CARD_LIFT_SHADOW = "drop-shadow(0 4px 6px rgba(20, 10, 5, 0.22)) drop-shadow(0 22px 28px rgba(20, 10, 5, 0.28))";

const STRIPS = 64;
const SLICE = CARD_WIDTH / STRIPS;
const MAX_CARD_H = 0.68; // center card height cap, share of screen height
const BEND_ANGLE = (62 * Math.PI) / 180; // how far the card has turned when it leaves the screen

type CarouselSettings = {
  cardWidth: number; // center card width, share of the screen width
  sideScale: number; // size of the side cards vs the center one
  side: number; // width of each side bend, share of screen width
  flat: number; // flat part of the side card before the bend, share of screen width
  scrollPerCard: number; // scroll distance per card, in screen heights
  bendRise: number; // extra height the bend gains by the screen edge (0.35 = 35% taller)
};

const DEFAULT_CAROUSEL: CarouselSettings = {
  cardWidth: 0.74,
  sideScale: 1,
  side: 0.06,
  flat: 0,
  scrollPerCard: 0.9,
  bendRise: 0.15,
};

// Track position (px from the screen center, as if everything were flat)
// -> screen x and half height (clamped at the screen edge, with out=true
// once past it).
function makeTrack(W: number, VH: number, st: CarouselSettings) {
  const cs = Math.min((st.cardWidth * W) / CARD_WIDTH, (MAX_CARD_H * VH) / CARD_HEIGHT);
  const Cw = CARD_WIDTH * cs;
  const H = CARD_HEIGHT * cs;
  const s = st.sideScale;
  const flatScr = st.flat * W;
  // The bends keep their set width; whatever is left becomes the gap.
  const gapScr = Math.max(0.015 * W, W / 2 - Cw / 2 - flatScr - st.side * W);
  const Gt = (2 * gapScr) / (1 + s);
  const Ft = flatScr / s;
  const xS = Cw / 2 + gapScr;
  const xF = xS + flatScr;
  const r = Math.max(24, W / 2 - xF);
  const tF = Cw / 2 + Gt + Ft;
  // The bend is the card wrapping round a cylinder that curves toward the
  // viewer: it foreshortens and grows taller (perspective) as it turns, and
  // runs off the screen edge at BEND_ANGLE instead of being squeezed flat.
  const grow = (th: number) => 1 + (st.bendRise * (1 - Math.cos(th))) / (1 - Math.cos(BEND_ANGLE));
  const c = r / (Math.sin(BEND_ANGLE) * grow(BEND_ANGLE));

  const at = (t: number): { x: number; hh: number; out: boolean } => {
    const sign = t < 0 ? -1 : 1;
    const a = Math.abs(t);
    let x: number;
    let hh: number;
    let out = false; // already past the screen edge
    if (a <= Cw / 2) {
      x = a;
      hh = H / 2;
    } else if (a <= Cw / 2 + Gt) {
      const q = (a - Cw / 2) / Gt;
      x = Cw / 2 + Gt * (q + ((s - 1) * q * q) / 2);
      hh = ((1 + (s - 1) * q) * H) / 2;
    } else if (a <= tF) {
      x = xS + (a - Cw / 2 - Gt) * s;
      hh = (s * H) / 2;
    } else {
      const th = ((a - tF) * s) / c;
      if (th > BEND_ANGLE) out = true;
      const thc = Math.min(th, BEND_ANGLE);
      x = xF + c * Math.sin(thc) * grow(thc);
      hh = ((s * H) / 2) * grow(thc);
    }
    return { x: x * sign, hh, out };
  };

  return { cs, H, spacing: Cw + Gt, at };
}

// Perspective transform taking the w x h box onto the quad
// TL(x0,-h0) TR(x1,-h1) BR(x1,h1) BL(x0,h0).
function sliceMatrix(w: number, h: number, x0: number, h0: number, x1: number, h1: number) {
  const [X0, Y0, X1, Y1, X2, Y2, X3, Y3] = [x0, -h0, x1, -h1, x1, h1, x0, h0];
  const dx1 = X1 - X2, dx2 = X3 - X2, dx3 = X0 - X1 + X2 - X3;
  const dy1 = Y1 - Y2, dy2 = Y3 - Y2, dy3 = Y0 - Y1 + Y2 - Y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hk = (dx1 * dy3 - dx3 * dy1) / den;
  const a = X1 - X0 + g * X1, b = X3 - X0 + hk * X3;
  const d = Y1 - Y0 + g * Y1, e = Y3 - Y0 + hk * Y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hk / h},0,0,1,0,${X0},${Y0},0,1)`;
}

export default function CaseStudyCarousel() {
  const [saved, setSt] = useState<Partial<CarouselSettings>>({});
  const st = { ...DEFAULT_CAROUSEL, ...saved };
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const CARDS = useCaseStudies(); // live from the /admin CRM (Firebase)

  useEffect(() => {
    const wrap = wrapRef.current;
    const frame = frameRef.current;
    if (!wrap || !frame) return;
    const slices = Array.from(frame.querySelectorAll<HTMLDivElement>("[data-slice]"));
    const update = () => {
      const W = frame.clientWidth;
      const VH = window.innerHeight;
      if (!W || !VH) return;
      const track = makeTrack(W, VH, st);
      // The pinned frame fills the screen with the card centered in it.
      // The pin lets go the moment the last card is centered, and the whole
      // section scrolls up together with the next section, which starts
      // right at the bottom of the screen (so it never shows while cards
      // are still sliding). marginTop keeps the 72px gap under the heading
      // set in ProblemsSolved.
      const stickTop = 0;
      const run = (CARDS.length - 1) * st.scrollPerCard * VH;
      frame.style.height = `${VH}px`;
      frame.style.top = "0px";
      wrap.style.marginTop = `${-Math.max(0, (VH - track.H) / 2)}px`;
      wrap.style.marginBottom = "0px";
      wrap.style.height = `${run + VH}px`;
      const done = Math.min(1, Math.max(0, (stickTop - wrap.getBoundingClientRect().top) / run));
      const p = done * (CARDS.length - 1);
      for (const el of slices) {
        const i = Number(el.dataset.card);
        const j = Number(el.dataset.slice);
        const u0 = j * SLICE;
        const u1 = u0 + SLICE + (j < STRIPS - 1 ? 1 : 0);
        const center = (i - p) * track.spacing;
        const a = track.at(center + (u0 - CARD_WIDTH / 2) * track.cs);
        const b = track.at(center + (u1 - CARD_WIDTH / 2) * track.cs);
        if ((a.out && b.out) || b.x - a.x < 0.05) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        el.style.transform = sliceMatrix(u1 - u0, CARD_HEIGHT, a.x, a.hh, b.x, b.hh);
      }
    };
    update();
    const unsub = scrollY.on("change", update);
    const ro = new ResizeObserver(update);
    ro.observe(frame);
    window.addEventListener("resize", update);
    return () => {
      unsub();
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  });

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ height: `calc(${(CARDS.length - 1) * st.scrollPerCard * 100}vh + 100vh)` }}
    >
      {/* the visual carousel is decorative (sliced copies); this is the
          accessible version with real links */}
      <ul className="sr-only">
        {CARDS.map((c) => (
          <li key={c.id}>
            {c.link && c.status !== "coming-soon" ? <a href={c.link} target="_blank" rel="noopener noreferrer">{c.title}</a> : `${c.title}${c.status === "coming-soon" ? " (coming soon)" : ""}`}
          </li>
        ))}
      </ul>
      <div ref={frameRef} aria-hidden="true" className="sticky top-0 h-screen w-full overflow-clip">
        {/* the cards' lift shadow: on this shared parent (not each card),
            because every card is drawn as clipped slices that would cut a
            per-card shadow off; drop-shadow follows the curved outline */}
        <div className="absolute left-1/2 top-1/2" style={{ filter: CARD_LIFT_SHADOW }}>
          {CARDS.map((card, i) =>
            Array.from({ length: STRIPS }, (_, j) => (
              <div
                key={`${card.id}-${j}`}
                data-card={i}
                data-slice={j}
                className="absolute left-0 top-0"
                style={{
                  width: SLICE + (j < STRIPS - 1 ? 1 : 0),
                  height: CARD_HEIGHT,
                  transformOrigin: "0 0",
                  visibility: "hidden",
                  willChange: "transform",
                }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <div style={{ marginLeft: -j * SLICE, width: CARD_WIDTH }}>
                    <CaseStudyCard study={card} focusable={false} />
                  </div>
                </div>
              </div>
            )),
          )}
        </div>
      </div>
      {process.env.NODE_ENV === "development" && <CarouselTuner st={st} onChange={setSt} />}
    </div>
  );
}

function CarouselTuner({ st, onChange }: { st: CarouselSettings; onChange: (s: CarouselSettings) => void }) {
  const [open, setOpen] = useState(false); // starts collapsed to the pill
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-14 left-4 z-[2000] hidden rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg desktop:block"
        style={{ cursor: "pointer" }}
      >
        Case study carousel
      </button>
    );
  }
  const rows: [string, keyof CarouselSettings, number, number, number, (v: number) => string][] = [
    ["Center card width", "cardWidth", 0.3, 0.8, 0.01, (v) => `${Math.round(v * 100)}% of screen`],
    ["Side card size", "sideScale", 0.5, 1.2, 0.01, (v) => `${Math.round(v * 100)}%`],
    ["Side bend width", "side", 0.02, 0.2, 0.005, (v) => `${(v * 100).toFixed(1)}%`],
    ["Flat part before bend", "flat", 0, 0.2, 0.005, (v) => `${(v * 100).toFixed(1)}%`],
    ["Bend height", "bendRise", 0, 1.5, 0.01, (v) => `+${Math.round(v * 100)}%`],
    ["Scroll per card", "scrollPerCard", 0.3, 2, 0.05, (v) => `${Math.round(v * 100)}vh`],
  ];
  return (
    <div className="fixed bottom-4 left-4 z-[2000] hidden w-[250px] rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur desktop:block">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Case study carousel (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>
      {rows.map(([name, k, min, max, step, fmt]) => (
        <div key={k} className="mb-2">
          <label className="flex justify-between">
            <span>{name}</span>
            <span className="tabular-nums">{fmt(st[k])}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={st[k]}
            onChange={(e) => onChange({ ...st, [k]: Number(e.target.value) })}
            className="w-full"
            style={{ cursor: "pointer" }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(DEFAULT_CAROUSEL)}
        className="mt-1 rounded bg-white/15 px-2 py-1 hover:bg-white/25"
        style={{ cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
}
