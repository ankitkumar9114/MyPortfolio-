"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { onPreloaderComplete } from "@/lib/preloaderSignal";
import { heroEntranceDelay } from "@/lib/heroEntranceTiming";

// Desktop hero's four edge-bleeding decorations (grandma, sunflowers,
// elephant, the "dekho magar pyar se" sticker) — pulled out of
// GradientHero.tsx into their own "use client" component (same reasoning
// as MobileAvatarToggle/HandsReveal: only this animated piece needs
// client-side behavior, so the rest of the desktop hero stays a Server
// Component) so each can slide in from off-screen once on page load.
//
// Unlike HandsReveal, this is NOT scroll-driven — it's a plain one-shot
// entrance, per request ("no need for any scrolling effect for these
// images"), that plays once the full-screen Preloader has finished (see
// onPreloaderComplete() below), not as soon as this component mounts —
// it mounts well before that, and playing immediately meant the whole
// slide-in finished entirely hidden behind the Preloader's opaque
// overlay. Each element slides in from whichever screen edge it sits
// nearest: grandma and the sunflowers bleed off the LEFT edge, so they
// enter from the left; the elephant and sticker bleed off the RIGHT
// edge, so they enter from the right.
//
// ENTRANCE_MULTIPLIER * an element's own rendered width gives a plain PX
// offset (1.5x its own width, comfortably clearing it off whatever
// viewport width the desktop breakpoint — 1025px+ — actually is) rather
// than a flat guessed px number that might not be quite enough (or way
// too much) depending on the element's size.
//
// This is deliberately PX (via a plain `x`), not a CSS-percent transform
// animated through GSAP's `xPercent` — a first pass baked
// `transform: translateX(-150%)` into the SSR markup (to avoid a flash;
// see below) and then used gsap's `xPercent` in the effect, but GSAP
// parses an element's PRE-EXISTING transform (from plain CSS, not
// previously touched by GSAP) into its own "x" (px) component only —
// it has no way to know that % was meant as "xPercent", so calling
// gsap.set(el, {xPercent: -150}) afterward ADDED another -150%-of-width
// on top of the already-parsed -150%-of-width from the CSS, instead of
// replacing it, and the leftover "x" component then never got animated
// away — the element visibly slid in but stopped well short of its true
// rest position. Using the exact same property (`x`, in px) for both the
// baked-in starting style and every GSAP call sidesteps that entirely:
// GSAP treats a later gsap.set({x: ...}) as REPLACING its tracked x, not
// adding to it, so there's no leftover offset.
type Side = "left" | "right";

const ENTRANCE_MULTIPLIER = 1.5;

// Each element's own rendered width (native px, matching the width each
// renders at in GradientHero's markup — grandma/sunflowers/sticker are
// sized to an explicit w-[Npx], elephant is h-[414px] w-auto which, given
// its native 300x414 ratio, resolves to exactly 300px). Needed here to
// compute each one's own starting x offset.
// Per request, everything in the hero intro comes in one by one — no two
// elements starting together. They start straight after the loader, in
// the order grandma, sunflowers, elephant, sticker.
// duration is per-item (defaulting to 1s) rather than a single value
// shared by all four, so any one of them can be sped up/slowed down
// independently — grandma is noticeably slower (1.8s) than the rest per
// request ("grandma is coming too fast" at the shared 1s duration).
const DECOR = [
  {
    key: "grandma",
    src: "/images/grandma.webp",
    side: "left" as Side,
    width: 478,
    height: 390,
    delay: heroEntranceDelay(0),
    duration: 1.8,
  },
  {
    key: "sunflowers",
    src: "/images/sunflowers.webp",
    side: "left" as Side,
    width: 202,
    height: 363,
    delay: heroEntranceDelay(1),
    duration: 1,
  },
  {
    key: "elephant",
    src: "/images/elephant.webp",
    side: "right" as Side,
    width: 300,
    height: 414,
    delay: heroEntranceDelay(2),
    duration: 1,
  },
  {
    key: "sticker",
    src: "/images/sticker - dekho.webp",
    side: "right" as Side,
    width: 208,
    height: 192,
    delay: heroEntranceDelay(3),
    duration: 1,
  },
];

function startX(side: Side, width: number): number {
  const distance = width * ENTRANCE_MULTIPLIER;
  return side === "left" ? -distance : distance;
}

// Baked directly into each <img>'s own inline style (present in the
// server-rendered HTML, not applied only after JS runs) so the very
// first paint — before React even hydrates — already shows the element
// off-screen. Without this, there's an unavoidable ~150-400ms window
// (SSR paint + hydration + effect execution) where the plain, un-animated
// markup shows each element already at its FINAL resting position, which
// then visibly jumps off-screen before animating back in — confirmed via
// a Playwright check on the first pass of this component.
function initialStyle(side: Side, width: number): CSSProperties {
  return { transform: `translateX(${startX(side, width)}px)`, opacity: 0 };
}

// Lit tip + continuous smoke rising from grandma's cigarette. The tip
// sits at (280, 104) in grandma.webp's own 478x390 pixel space (measured
// off an enlarged crop of the image), and the image renders at exactly
// its native size, so those px land on the tip directly. Rendered inside
// the same wrapper GSAP slides in, so the smoke travels with her rather
// than appearing early at her final spot. Keyframes live in globals.css
// (grandma-smoke / grandma-ember), both off under reduced motion.
const CIGARETTE_TIP = { x: 280, y: 104 };
const SMOKE_PUFFS = [0, 0.8, 1.6, 2.4, 3.2];

function CigaretteSmoke() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: CIGARETTE_TIP.x, top: CIGARETTE_TIP.y, width: 0, height: 0 }}
    >
      {SMOKE_PUFFS.map((delay) => (
        <span key={delay} className="grandma-smoke-puff" style={{ animationDelay: `${delay}s` }} />
      ))}
      <span className="grandma-ember" />
    </div>
  );
}

export default function DesktopDecorEntrance() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Waits for the full-screen Preloader to actually finish before
    // playing — it mounts (and, pre-fix, used to start animating) well
    // before that, but the Preloader's own z-[1000] overlay covers the
    // entire viewport for its ~2.5s runtime, so the slide-in was
    // completing entirely unseen behind it. onPreloaderComplete() fires
    // immediately if the preloader already finished (or was skipped
    // under reduced motion) by the time this effect runs, so there's no
    // risk of waiting forever.
    if (isReducedMotion()) {
      return onPreloaderComplete(() => {
        gsap.set(refs.current.filter(Boolean), { x: 0, opacity: 1 });
      });
    }

    let ctx: ReturnType<typeof gsap.context> | undefined;
    const unsubscribe = onPreloaderComplete(() => {
      ctx = gsap.context(() => {
        DECOR.forEach((item, i) => {
          const el = refs.current[i];
          if (!el) return;
          // Registers the already-painted starting x with GSAP (matches
          // the baked-in inline style exactly, so this is a no-op
          // visually) before animating away from it.
          gsap.set(el, { x: startX(item.side, item.width), opacity: 0 });
          gsap.to(el, { x: 0, opacity: 1, duration: item.duration, delay: item.delay, ease: "power3.out" });
        });
      });
    });

    return () => {
      unsubscribe();
      ctx?.revert();
    };
  }, []);

  return (
    <>
      {/* Skateboarding grandma illustration, bleeding slightly off the left
          edge like the corner graphics do. z-[11] sits above the border
          frame (z-10) so she overlaps in front of the gold border line,
          rather than being clipped behind it. */}
      <div
        ref={(el) => {
          refs.current[0] = el;
        }}
        className="pointer-events-none absolute -left-[160px] top-[80px] z-[11] h-[390px] w-[478px] select-none"
        style={initialStyle(DECOR[0].side, DECOR[0].width)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src={DECOR[0].src}
          alt=""
          aria-hidden="true"
          width={DECOR[0].width}
          height={DECOR[0].height}
          className="h-full w-full"
        />
        <CigaretteSmoke />
      </div>

      {/* Sunflowers, bleeding off the left edge below the grandma
          illustration (grandma: top-80 + h-390 = bottom 470, +16px gap =
          top-486). z-[11], same as grandma, so it also overlaps in front of
          the border frame instead of being clipped behind it. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        ref={(el) => {
          refs.current[1] = el;
        }}
        src={DECOR[1].src}
        alt=""
        aria-hidden="true"
        width={DECOR[1].width}
        height={DECOR[1].height}
        className="pointer-events-none absolute -left-5 top-[486px] z-[11] h-[363px] w-[202px] select-none"
        style={initialStyle(DECOR[1].side, DECOR[1].width)}
      />

      {/* Elephant, top-right, mirroring how grandma bleeds off the left —
          the illustration itself is already drawn "half cut" on its right
          side, so it reads as partially cropped without needing to clip it
          further. z-[11]: above the border frame, same as grandma. Native
          size is 300x414 (aspect ratio ~0.725) — h-[414px] w-auto keeps that
          ratio intact (this works out to exactly its native size). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        ref={(el) => {
          refs.current[2] = el;
        }}
        src={DECOR[2].src}
        alt=""
        aria-hidden="true"
        width={DECOR[2].width}
        height={DECOR[2].height}
        className="pointer-events-none absolute -right-5 top-[70px] z-[11] h-[414px] w-auto select-none"
        style={initialStyle(DECOR[2].side, DECOR[2].width)}
      />

      {/* "Dekho magar pyar se" sticker, right side, below the elephant.
          Elephant: top-70 + h-414 = bottom-484; a -32px gap means it starts
          32px above that (overlapping), at top-452. z-[12] so the overlap
          renders the sticker on top of the elephant, not tucked behind it. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        ref={(el) => {
          refs.current[3] = el;
        }}
        src={DECOR[3].src}
        alt=""
        aria-hidden="true"
        width={DECOR[3].width}
        height={DECOR[3].height}
        className="pointer-events-none absolute right-[44px] top-[452px] z-[12] h-[192px] w-[208px] select-none"
        style={initialStyle(DECOR[3].side, DECOR[3].width)}
      />
    </>
  );
}
