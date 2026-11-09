"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";

// Photos for the selected fridge magnet: polaroid-style prints that fly out
// of a small stack of prints peeking up at the window's bottom center and scatter across the middle
// of the chatai (over the printed title). Picking another magnet dissolves
// the current set while the new one flies in; deselecting dissolves it.
// Every photo can be dragged; the one you press comes to the top.
//
// Photos live in public/images/memories/<place>/photo-1..6.webp. The current
// files are stand-ins cut from each place's sticker art: replace them with
// real photos (any aspect; keep the names, or edit PHOTO_COUNT).

const PHOTO_COUNT = 6;
// Dissolve: each photo fades, softens, drifts up and shrinks a touch, with a
// small random stagger. The next set waits until the old one is gone.
const DISSOLVE_MS = 750;
const DISSOLVE_STAGGER_MS = 150;
const SWAP_GAP_MS = DISSOLVE_MS + DISSOLVE_STAGGER_MS;

// Scatter spots (photo centers, % of the frame) around the middle, with a
// little random jitter and tilt per trip.
// The stack of prints the photos come from: bottom center, mostly below the
// window's edge. Cards are STACK_SCALE of a photo's size.
const STACK_SCALE = 0.72;
const STACK_CARDS = [
  { src: "/images/memories/coorg/photo-5.webp", rot: -9, x: -14 },
  { src: "/images/memories/varkala/photo-2.webp", rot: 6, x: 12 },
  { src: "/images/memories/goa/photo-5.webp", rot: -3, x: -3 },
  { src: "/images/memories/banaras/photo-2.webp", rot: 4, x: 5 },
];

const SPOTS: [number, number][] = [
  [37, 30],
  [50, 25],
  [63, 31],
  [38, 66],
  [51, 71],
  [63, 64],
];

type Photo = {
  id: string;
  src: string;
  place: string;
  x: number; // % of the frame width (center)
  y: number; // % of the frame height (center)
  rot: number;
  delay: number; // ms (entrance)
  dur: number; // ms
  outDelay: number; // ms (dissolve stagger)
  spin: number; // deg, extra tilt while flying
};
type PhotoSet = { key: number; place: string; photos: Photo[]; leaving: boolean };

let setKey = 0;
function makeSet(place: string, waitMs: number): PhotoSet {
  const key = ++setKey;
  const slug = place.toLowerCase();
  return {
    key,
    place,
    leaving: false,
    photos: Array.from({ length: PHOTO_COUNT }, (_, i) => ({
      id: `${key}-${i}`,
      src: `/images/memories/${slug}/photo-${i + 1}.webp`,
      place,
      x: SPOTS[i % SPOTS.length][0] + (Math.random() - 0.5) * 5,
      y: SPOTS[i % SPOTS.length][1] + (Math.random() - 0.5) * 6,
      rot: (Math.random() - 0.5) * 22,
      delay: Math.round(waitMs + Math.random() * 380),
      outDelay: Math.round(Math.random() * DISSOLVE_STAGGER_MS),
      dur: Math.round(700 + Math.random() * 350),
      spin: Math.round((Math.random() - 0.5) * 70),
    })),
  };
}

export default function MemoryPhotos({ place }: { place: string | null }) {
  // Sets on screen: the current one plus any still dissolving. Updated
  // during render when `place` changes (React's "derive from props" pattern).
  const [sets, setSets] = useState<PhotoSet[]>([]);
  const [shownPlace, setShownPlace] = useState<string | null>(null);
  if (place !== shownPlace) {
    setShownPlace(place);
    // The new set waits (parked below the window) until the old one is
    // gone. Built once here, not inside the updater: React may replay
    // updaters, which would re-roll the set and restart its entrance.
    const wait = sets.some((s) => !s.leaving) ? SWAP_GAP_MS : 0;
    const next = place ? [makeSet(place, wait)] : [];
    setSets((cur) => [...cur.map((s) => ({ ...s, leaving: true })), ...next]);
  }
  // remove dissolved sets once their fade has played
  const hasLeaving = sets.some((s) => s.leaving);
  useEffect(() => {
    if (!hasLeaving) return;
    const t = setTimeout(() => setSets((cur) => cur.filter((s) => !s.leaving)), SWAP_GAP_MS + 50);
    return () => clearTimeout(t);
  }, [hasLeaving, sets]);

  // drag offsets + stacking order per photo
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [zs, setZs] = useState<Record<string, number>>({});
  const zTop = useRef(10);
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ id: string; x0: number; y0: number; ox: number; oy: number } | null>(null);

  const onDown = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const o = offsets[id] ?? { x: 0, y: 0 };
    drag.current = { id, x0: e.clientX, y0: e.clientY, ox: o.x, oy: o.y };
    zTop.current += 1;
    setZs((cur) => ({ ...cur, [id]: zTop.current }));
    setDragging(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const d = drag.current;
    if (!d) return;
    setOffsets((cur) => ({ ...cur, [d.id]: { x: d.ox + e.clientX - d.x0, y: d.oy + e.clientY - d.y0 } }));
  };
  const onUp = () => {
    drag.current = null;
    setDragging(null);
  };

  return (
    <div aria-label="Photos" className="pointer-events-none absolute inset-0 z-40">
      {/* the stack at the bottom center (in with the magnets) */}
      <div aria-hidden="true" className="memory-stack">
        {STACK_CARDS.map((c, i) => (
          <div key={i} className="memory-photo memory-stack-card" style={{ rotate: `${c.rot}deg`, translate: `${c.x}% 0` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
            <img src={c.src} alt="" draggable={false} className="block h-auto w-full select-none" />
            <span className="memory-caption">&nbsp;</span>
          </div>
        ))}
      </div>
      {/* keyed per set: when an old set is removed, the current one must
          keep its identity (unkeyed, it would shift position and remount,
          restarting its entrance) */}
      {sets.map((set) => (
        <Fragment key={set.key}>
        {set.photos.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%`, translate: "-50% -50%", zIndex: zs[p.id] ?? 1 }}
          >
            {/* entrance: from the window's bottom center to this spot */}
            <div
              className={`memory-photo-in ${set.leaving ? "memory-photo-out" : ""}`}
              style={
                {
                  // from the stack: bottom center, a little inside the edge
                  "--from-x": `${50 - p.x}vw`,
                  "--from-y": `calc(${100 - p.y}vh - 18%)`,
                  "--from-scale": String(STACK_SCALE),
                  "--spin": `${p.spin}deg`,
                  // inline timing (beats the class shorthand), per phase
                  animationDelay: `${set.leaving ? p.outDelay : p.delay}ms`,
                  animationDuration: `${set.leaving ? DISSOLVE_MS : p.dur}ms`,
                } as CSSProperties
              }
            >
              {/* drag offset */}
              <div style={{ transform: `translate(${offsets[p.id]?.x ?? 0}px, ${offsets[p.id]?.y ?? 0}px)` }}>
                <div
                  role="img"
                  aria-label={`${p.place} photo`}
                  className={`memory-photo ${set.leaving ? "" : "pointer-events-auto"} ${dragging === p.id ? "is-dragging" : ""}`}
                  style={{ rotate: `${p.rot}deg` }}
                  onPointerDown={onDown(p.id)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user photo */}
                  <img src={p.src} alt="" draggable={false} className="block h-auto w-full select-none" />
                  <span className="memory-caption">{p.place}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        </Fragment>
      ))}
    </div>
  );
}
