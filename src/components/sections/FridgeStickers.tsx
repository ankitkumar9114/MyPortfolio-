"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_FAN } from "./FanShadow";
import MemoryPhotos from "./MemoryPhotos";

// Travel fridge-magnet stickers placed down both sides of the chatai (the
// "My Fridge Magnet Collection"), hugging the window's edges like badges and
// leaving the printed title in the middle clear. Once the mat is fully open
// (the frame's data-open), together with the fan, they fly in from their own
// side in a random order.
//
// Shadows take the fan as their light source: each one falls away from the
// fan's position (top-right), so the direction differs per sticker. On hover
// (pixel-accurate) a sticker comes over all the others, lifts off and gently
// hovers ("flying"): it grows a little, and
// its shadow moves farther out, softer and lighter, as it would for an
// object raised above the surface.

type Sticker = {
  name: string;
  w: number; h: number; // image size (aspect)
  side: "left" | "right";
  x: number; // % of the frame's width from that side's edge to the sticker's edge
  y: number; // % of the frame's height from the top
  size: number; // width, % of the frame's width (at the reference shape)
  rot: number; // deg
};

// raw-images/<Name> Sticker.png -> public/images/stickers/<name>.webp (trimmed).
// Layout from the user's reference: a loose cluster down each side, framing
// the white middle (measured off a 2000x1263 mock).
const STICKERS: Sticker[] = [
  { name: "Coorg", w: 619, h: 640, side: "left", x: 14.3, y: 4.8, size: 15.8, rot: 5 },
  { name: "Goa", w: 637, h: 640, side: "left", x: 3.9, y: 27.3, size: 15.7, rot: -3 },
  { name: "Pondicherry", w: 640, h: 541, side: "left", x: 2, y: 54, size: 19.5, rot: 3 },
  { name: "Coonoor", w: 640, h: 525, side: "left", x: 13.5, y: 70.5, size: 16.5, rot: 5 },
  { name: "Kodaikanal", w: 628, h: 640, side: "right", x: 17.3, y: 5.1, size: 15, rot: -3 },
  { name: "Banaras", w: 640, h: 591, side: "right", x: 2.5, y: 19.4, size: 16.3, rot: 7 },
  { name: "Ayodhya", w: 640, h: 634, side: "right", x: 4, y: 42.8, size: 15.8, rot: -2 },
  { name: "Varkala", w: 640, h: 630, side: "right", x: 10.5, y: 68, size: 16.5, rot: -3 },
];

// The reference's shape (width / height). Sizes are % of the width, capped
// by the equivalent share of the height so the cluster keeps its
// proportions on wider windows.
const REF_ASPECT = 2000 / 1263;
// Slightly bigger than the reference, per request.
const SIZE_BOOST = 1.08;
const SHADOW_REST = 11; // px offset while resting on the mat
const SHADOW_LIFT = 3; // multiplier for the offset while flying

// Shadow direction: from the fan's center (light source) through the
// sticker's approximate center.
function shadowVars(s: Sticker): CSSProperties {
  const fanX = 100 - DEFAULT_FAN.right; // % of width
  const fanY = DEFAULT_FAN.top; // % of height
  const half = (s.size * SIZE_BOOST) / 2;
  const cx = s.side === "left" ? s.x + half : 100 - s.x - half;
  const cy = s.y + half * REF_ASPECT * (s.h / s.w);
  const dx = (cx - fanX) * REF_ASPECT;
  const dy = cy - fanY;
  const len = Math.hypot(dx, dy) || 1;
  return {
    "--sx": `${((dx / len) * SHADOW_REST).toFixed(2)}px`,
    "--sy": `${((dy / len) * SHADOW_REST).toFixed(2)}px`,
    "--lift": String(SHADOW_LIFT),
  } as CSSProperties;
}

// Entrance: left stickers fly in from beyond the left edge, right ones from
// the right, each with a random delay, speed and spin, re-rolled every time
// the mat opens (so the order is different each time).
function rollTrip(root: HTMLElement, entering: boolean) {
  root.querySelectorAll<HTMLElement>(".fridge-slot").forEach((el) => {
    // entering: relaxed and staggered; leaving: quick, so they're gone
    // before the mat starts rolling back up
    const delay = entering ? Math.random() * 650 : Math.random() * 120;
    const dur = entering ? 650 + Math.random() * 450 : 380 + Math.random() * 160;
    el.style.setProperty("--delay", `${Math.round(delay)}ms`);
    el.style.setProperty("--dur", `${Math.round(dur)}ms`);
    el.style.setProperty("--spin", `${Math.round((Math.random() - 0.5) * 50)}deg`);
  });
}

// Moving gradient border around the magnet's own silhouette, shown when
// selected (the gradient flows around continuously, see .fridge-outline-ring):
// the gradient masked by the sticker image, stamped in a ring of offsets
// behind it (so it outlines any shape).
const OUTLINE_PX = 4;
const OUTLINE_OFFSETS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return [Math.cos(a) * OUTLINE_PX, Math.sin(a) * OUTLINE_PX];
});
function SelectOutline({ src }: { src: string }) {
  return (
    <span aria-hidden="true" className="fridge-outline pointer-events-none absolute inset-0">
      {OUTLINE_OFFSETS.map(([x, y], i) => (
        <span
          key={i}
          className="fridge-outline-ring absolute inset-0"
          style={{
            translate: `${x.toFixed(2)}px ${y.toFixed(2)}px`,
            maskImage: `url('${src}')`,
            WebkitMaskImage: `url('${src}')`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      ))}
    </span>
  );
}

// Pixel-accurate hit testing: a small alpha map per sticker, so hover follows
// the visible artwork, not the image's transparent corners (which otherwise
// steal the pointer where stickers overlap).
const ALPHA_W = 96;
type AlphaMap = { w: number; h: number; a: Uint8ClampedArray };
function loadAlpha(src: string) {
  return new Promise<AlphaMap | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = ALPHA_W, h = Math.max(1, Math.round((ALPHA_W * img.naturalHeight) / img.naturalWidth));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return resolve(null);
      g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      const a = new Uint8ClampedArray(w * h);
      for (let k = 0; k < w * h; k++) a[k] = d[k * 4 + 3];
      resolve({ w, h, a });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// Is the window point (px, py) on the sticker's visible pixels? Undoes its
// rotation (and the lift's scale/raise when it's up) around its center.
function hits(el: HTMLElement, map: AlphaMap, rotDeg: number, lifted: boolean, px: number, py: number) {
  const r = el.getBoundingClientRect(); // axis-aligned box of the rotated slot
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const w = el.offsetWidth, h = el.offsetHeight;
  const t = (-rotDeg * Math.PI) / 180;
  let x = (px - cx) * Math.cos(t) - (py - cy) * Math.sin(t);
  let y = (px - cx) * Math.sin(t) + (py - cy) * Math.cos(t);
  if (lifted) {
    y += 14;
    x /= 1.08;
    y /= 1.08;
  }
  const u = x / w + 0.5, v = y / h + 0.5;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
  return map.a[Math.floor(v * map.h) * map.w + Math.floor(u * map.w)] > 40;
}

const SCROLL_UP_DISMISS_PX = 30;

export default function FridgeStickers() {
  const ref = useRef<HTMLDivElement>(null);
  // Clicked magnet: stays lifted ("flying") with a moving gradient border
  // until clicked again, another one is picked, you click elsewhere, or Esc.
  const [selected, setSelected] = useState<string | null>(null);
  // Hovered magnet (pixel-accurate): lifts and comes over all the others.
  const [hovered, setHovered] = useState<string | null>(null);
  const maps = useRef<Record<string, AlphaMap | null>>({});
  const slots = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let alive = true;
    for (const s of STICKERS) {
      loadAlpha(`/images/stickers/${s.name.toLowerCase()}.webp`).then((m) => {
        if (alive) maps.current[s.name] = m;
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  // Topmost sticker whose visible pixels are under the pointer, checked in
  // stacking order: hovered, selected, then later-in-the-list first.
  const pick = (px: number, py: number) => {
    const order = [...STICKERS].reverse().sort((a, b) => rank(b.name) - rank(a.name));
    for (const s of order) {
      const el = slots.current[s.name];
      const map = maps.current[s.name];
      if (el && map && hits(el, map, s.rot, s.name === hovered || s.name === selected, px, py)) return s.name;
    }
    return null;
  };
  const rank = (name: string) => (name === hovered ? 2 : name === selected ? 1 : 0);

  // Any scroll back up (past a small threshold) puts the magnet down, which
  // dissolves its photos.
  useEffect(() => {
    if (!selected) return;
    let lastY = window.scrollY;
    let up = 0;
    const onScroll = () => {
      const y = window.scrollY;
      up = y < lastY ? up + (lastY - y) : 0;
      lastY = y;
      if (up > SCROLL_UP_DISMISS_PX) setSelected(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setSelected(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);
  useEffect(() => {
    const root = ref.current;
    const frame = root?.closest<HTMLElement>("[data-open]");
    if (!root || !frame) return;
    rollTrip(root, true);
    // fresh random timing for every trip (applied before the transition
    // starts: mutation callbacks run before the next style recalc)
    const mo = new MutationObserver(() => {
      rollTrip(root, frame.dataset.open === "true");
      // scrolled back up: drop hover and the selection, which dissolves
      // the selected magnet's photos
      if (frame.dataset.open !== "true") {
        setHovered(null);
        setSelected(null);
      }
    });
    mo.observe(frame, { attributes: true, attributeFilter: ["data-open"] });
    return () => mo.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-label="Fridge magnet stickers"
      role="list"
      // the layer takes the pointer (only once open) and decides which
      // sticker is under it from their pixels
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block group-data-[open=true]:pointer-events-auto"
      style={{ cursor: hovered ? "pointer" : undefined }}
      onPointerMove={(e) => {
        const name = pick(e.clientX, e.clientY);
        if (name !== hovered) setHovered(name);
      }}
      onPointerLeave={() => setHovered(null)}
      onClick={(e) => {
        const name = pick(e.clientX, e.clientY);
        setSelected((cur) => (name ? (cur === name ? null : name) : null));
      }}
    >
      {STICKERS.map((s) => (
        <div
          key={s.name}
          ref={(el) => {
            slots.current[s.name] = el;
          }}
          role="listitem"
          className="fridge-slot pointer-events-none absolute"
          style={
            {
              zIndex: hovered === s.name ? 30 : selected === s.name ? 20 : undefined,
              [s.side]: `${s.x}%`,
              top: `${s.y}%`,
              width: `min(${(s.size * SIZE_BOOST).toFixed(2)}vw, ${(s.size * SIZE_BOOST * REF_ASPECT).toFixed(2)}vh)`,
              "--rot": `${s.rot}deg`,
              // start fully beyond its own side of the window
              "--from-x": s.side === "left" ? `calc(-${s.x}vw - 110%)` : `calc(${s.x}vw + 110%)`,
            } as CSSProperties
          }
        >
          <div
            role="button"
            tabIndex={0}
            aria-pressed={selected === s.name}
            aria-label={`${s.name} Sticker`}
            className={`fridge-sticker${hovered === s.name ? " is-hovered" : ""}${selected === s.name ? " is-selected" : ""}`}
            style={shadowVars(s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected((cur) => (cur === s.name ? null : s.name));
              }
            }}
          >
            <SelectOutline src={`/images/stickers/${s.name.toLowerCase()}.webp`} />
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative raster */}
            <img
              src={`/images/stickers/${s.name.toLowerCase()}.webp`}
              alt={`${s.name} Sticker`}
              title={`${s.name} Sticker`}
              width={s.w}
              height={s.h}
              loading="lazy"
              draggable={false}
              className="relative block h-auto w-full select-none"
            />
          </div>
        </div>
      ))}
      {/* the selected magnet's photos, over the middle of the mat */}
      <MemoryPhotos place={selected} />
    </div>
  );
}
