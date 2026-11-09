"use client";

import { useEffect, useRef } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { onPreloaderComplete } from "@/lib/preloaderSignal";
import { heroEntranceDelay } from "@/lib/heroEntranceTiming";

// Six-armed "master of tools" hands — moved out of GradientHero.tsx into
// their own "use client" component (same reasoning as MobileAvatarToggle:
// only this interactive piece needs client-side behavior, so the rest of
// the desktop hero stays a Server Component) now that they need real
// scroll-driven behavior instead of being static <img> tags.
//
// Per-hand scale variables — unchanged from the original GradientHero.tsx
// version: still the one place to bump a hand's size up/down without ever
// touching width/height by hand (see handSize() below).
const HAND_CARDS_SCALE = 0.85;
const HAND_BOOK_SCALE = 1.01;
const HAND_AI_SCALE = 1.1;
const HAND_MAGNIFIER_SCALE = 0.93;
const HAND_BLENDER_SCALE = 1.0;
const HAND_COFFEE_SCALE = 1.0;

// nativeW/nativeH are each hand image's real pixel dimensions — baseWidth*
// scale gives the rendered width, and height is computed from that same
// ratio, so the two can never drift apart.
function handSize(baseWidth: number, scale: number, nativeW: number, nativeH: number) {
  const width = baseWidth * scale;
  const height = (width * nativeH) / nativeW;
  return { width, height };
}

type Anchor = "left" | "right";

// anchor/offset/top position each hand's BOX in the shared 614x754
// container (unchanged from before) — which edge of the box is pinned
// (`right` for left-side hands, `left` for right-side ones, matching
// whichever edge sits nearest the avatar's body) and how far off it.
//
// anchorX/anchorY are a separate concern: the rotation pivot, expressed as
// a plain CSS position INSIDE that hand's own box (its own local "0% 0%"
// is the box's top-left corner, "100% 100%" its bottom-right) — a real
// coordinate in that div, not derived from anchor/offset/top at all. Every
// hand can have a completely different pivot location this way (anywhere
// inside, or even outside, its own box via calc()), independent of how
// it's positioned in the shared container. Accepts any valid
// transform-origin length: "62%", "calc(50% + 10px)", "40px", etc.
// Defaults below reproduce each hand's previous edge-anchored pivot
// exactly (100%/0% horizontally to match its old left/right anchor edge,
// 50% vertically, +10px for the cards hand's earlier vertical nudge) —
// nothing has visually moved, this is purely the refactor to per-hand
// in-box coordinates asked for.
type HandConfig = {
  src: string;
  anchor: Anchor;
  offset: number;
  top: number;
  baseWidth: number;
  scale: number;
  nativeW: number;
  nativeH: number;
  anchorX: string;
  anchorY: string;
  // The scroll-reveal's actual rotation range for this hand, in degrees.
  // initialRotation is what it's rotated to at page load (scroll 0, around
  // its own anchorX/anchorY pivot above); finalRotation is what it settles
  // to once the avatar has scrolled into the main viewport. Every hand
  // defaults to the same 180 -> 0 sweep that was previously hardcoded once
  // for all of them — i.e. "current" behavior, unchanged — but each hand
  // can now have its own independent range (e.g. a hand could instead
  // sweep 120 -> 0, or even -40 -> 0) without touching any other hand.
  initialRotation: number;
  finalRotation: number;
};

const HANDS: HandConfig[] = [
  {
    src: "/images/Hand with photo show cards.webp",
    anchor: "right",
    offset: 460,
    top: 60,
    baseWidth: 340,
    scale: HAND_CARDS_SCALE,
    nativeW: 560,
    nativeH: 736,
    anchorX: "90%",
    anchorY: "calc(85% + 10px)",
    initialRotation: -180,
    finalRotation: 0,
  },
  {
    src: "/images/hand iwth book.webp",
    anchor: "right",
    offset: 470.2,
    top: 280,
    baseWidth: 380,
    scale: HAND_BOOK_SCALE,
    nativeW: 748,
    nativeH: 539,
    anchorX: "95%",
    anchorY: "75%",
    initialRotation: -180,
    finalRotation: 0,
  },
  {
    src: "/images/hand wiht ai.webp",
    anchor: "right",
    offset: 356,
    top: 500,
    baseWidth: 380,
    scale: HAND_AI_SCALE,
    nativeW: 995,
    nativeH: 569,
    anchorX: "85%",
    anchorY: "50%",
    initialRotation: -180,
    finalRotation: 0,
  },
  {
    src: "/images/Hand with magnifing glass.webp",
    anchor: "left",
    offset: 490,
    top: 50,
    baseWidth: 300,
    scale: HAND_MAGNIFIER_SCALE,
    nativeW: 518,
    nativeH: 786,
    anchorX: "10%",
    anchorY: "85%",
    initialRotation: 180,
    finalRotation: 0,
  },
  {
    src: "/images/hand with belnder.webp",
    anchor: "left",
    offset: 520,
    top: 270,
    baseWidth: 380,
    scale: HAND_BLENDER_SCALE,
    nativeW: 756,
    nativeH: 631,
    anchorX: "0%",
    anchorY: "75%",
    initialRotation: 180,
    finalRotation: 0,
  },
  {
    src: "/images/Hand with coffe.webp",
    anchor: "left",
    offset: 400,
    top: 560,
    baseWidth: 380,
    scale: HAND_COFFEE_SCALE,
    nativeW: 698,
    nativeH: 322,
    anchorX: "0%",
    anchorY: "35%",
    initialRotation: 180,
    finalRotation: 0,
  },
];

// Scroll range the rotate-reveal scrubs across. The END is keyed off the
// avatar element (data-hero-avatar, set on the desktop avatar wrapper in
// GradientHero.tsx) — querying it by a stable attribute means this client
// component never needs a ref passed down from its (Server Component)
// parent. The START, though, is deliberately NOT keyed off the avatar too
// (e.g. "top 85%" of the viewport): this hero is tall enough, relative to
// a lot of real viewport heights, that the avatar can already be sitting
// well inside the viewport at scrollY 0 — an avatar-relative start would
// then already be "passed" before any scrolling happens, so the hands
// would render partway rotated (not the requested full 180deg) right when
// the site loads. Pinning the start to `document.body`/"top top" instead
// sidesteps that: body's top is always exactly page-scroll 0, so this
// scrub's progress is guaranteed to be 0 (hands at 180deg) at page load
// regardless of hero/viewport height, no matter which element they're
// nested inside. end: avatar's top nearing 40% down the viewport — reads
// as "came into the main viewport", where the hands finish at their final
// (0deg, current) position. scrub ties progress directly to scroll
// position (rather than firing once), per request ("on scrolling hand
// will rotate").
//
// None of this depends on where each hand's pivot (anchorX/anchorY) sits
// — GSAP only ever tweens `rotation` here, and the browser rotates
// whatever element around whatever transform-origin it's been given
// regardless of where that point is, so moving a hand's pivot anywhere
// inside (or outside) its own box doesn't change the scroll wiring at all.
const SCRUB_END = "top 40%";

export default function HandsReveal() {
  const handRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    // Registers each hand's starting rotation with GSAP RIGHT AWAY —
    // matches the baked-in inline `transform: rotate(...)` on each <img>
    // below exactly, so this is a no-op visually, not a jump. This has to
    // happen immediately, not deferred with the ScrollTrigger setup below:
    // a previous pass moved the ENTIRE effect (including this) behind a
    // setTimeout for performance, which meant the hands rendered at their
    // plain, unrotated FINAL pose for that whole delay window (nothing
    // was setting rotation yet) and then visibly snapped to the rotated
    // starting pose the instant the delayed setup finally ran — exactly
    // backwards from the intended "hidden, rotated behind the avatar
    // until scrolled" effect, and the bug being fixed here.
    HANDS.forEach((hand, i) => {
      const el = handRefs.current[i];
      if (el) gsap.set(el, { rotation: hand.initialRotation });
    });

    // Waits for the full-screen Preloader to finish before setting up the
    // ScrollTrigger — a first pass created it immediately on mount, i.e.
    // while the Preloader was still counting up. Nothing about the hands
    // was visible yet either way (the Preloader's opaque overlay covers
    // them), but creating a scrub-driven ScrollTrigger involves real
    // layout work (measuring the avatar's position, wiring scroll
    // listeners), and doing that on top of everything ELSE initializing
    // at once — Lenis, the Preloader's own counter tween, ~15+ hero
    // images still decoding — was adding to visible jank during the
    // loading screen itself. Deferring IT (not the initial rotation set
    // above) spreads that work out instead of front-loading all of it
    // into the same instant.
    //
    // `ctx`/`timeoutId` are declared before the onPreloaderComplete() call
    // (not after) because that call can invoke its callback SYNCHRONOUSLY
    // if the preloader has already finished by the time this effect runs
    // (see preloaderSignal.ts) — assigning to them from inside that
    // callback would otherwise reference them before their declaration ran.
    let ctx: ReturnType<typeof gsap.context> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onPreloaderComplete(() => {
      // A further short delay (past the whole greeting/headline/decor
      // sequence in heroEntranceTiming.ts, index 6) before setting up the
      // ScrollTrigger — that setup does real layout work (measuring the
      // avatar's position, wiring scroll listeners), and running it in
      // the exact same tick as the burst of gsap.set() calls those other
      // components make right when the preloader finishes was adding to
      // the jank this whole one-by-one sequencing is meant to avoid.
      timeoutId = setTimeout(() => {
        const avatar = document.querySelector<HTMLElement>("[data-hero-avatar]");
        if (!avatar) return;

        if (isReducedMotion()) {
          // Reduced motion still needs each hand at ITS OWN finalRotation,
          // not a blanket 0 — they don't all necessarily share the same
          // final angle now that it's per-hand.
          HANDS.forEach((hand, i) => {
            const el = handRefs.current[i];
            if (el) gsap.set(el, { rotation: hand.finalRotation });
          });
          return;
        }

        ctx = gsap.context(() => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              endTrigger: avatar,
              end: SCRUB_END,
              // scrub: 1 (a "catch-up" duration in seconds) instead of
              // `true` (instant 1:1 tracking) — `true` snaps the rotation
              // to match scroll position exactly every frame, which reads
              // as jerky on a fast wheel flick or trackpad fling since
              // there's zero smoothing between scroll updates. A numeric
              // scrub has GSAP ease the animated value toward wherever the
              // scroll position currently says it should be, over that
              // many seconds, so fast or chunky scroll input still
              // produces fluid motion instead of snapping. Doesn't touch
              // initialRotation/finalRotation at all — same endpoints,
              // just a smoother ride between them.
              scrub: 1,
            },
          });
          // Every hand animates on the same 0 -> 1 scrub range in parallel
          // (position 0 for each fromTo), not staggered — they all fold
          // out from behind him together as the avatar scrolls into view.
          // Each hand's own initialRotation/finalRotation drives its sweep
          // now, instead of a single 180/0 pair shared by all six.
          HANDS.forEach((hand, i) => {
            const el = handRefs.current[i];
            if (!el) return;
            tl.fromTo(
              el,
              { rotation: hand.initialRotation },
              { rotation: hand.finalRotation, ease: "none" },
              0,
            );
          });
        });
      }, heroEntranceDelay(4) * 1000);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
      ctx?.revert();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute left-1/2 top-[46px] z-[8] h-[754px] w-[614px] -translate-x-1/2 select-none">
      {HANDS.map((hand, i) => {
        const { width, height } = handSize(hand.baseWidth, hand.scale, hand.nativeW, hand.nativeH);
        return (
          // Positioning box — carries the hand's placement in the shared
          // container (anchor/offset/top, exactly as before) and nothing
          // else.
          <div
            key={hand.src}
            className="absolute"
            style={{
              [hand.anchor]: `${hand.offset}px`,
              top: `${hand.top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
            <img
              ref={(el) => {
                handRefs.current[i] = el;
              }}
              src={hand.src}
              alt=""
              aria-hidden="true"
              width={hand.nativeW}
              height={hand.nativeH}
              className="absolute inset-0 h-full w-full select-none"
              style={{
                transformOrigin: `${hand.anchorX} ${hand.anchorY}`,
                // Baked in directly (present in the server-rendered HTML,
                // not applied only after JS/GSAP runs) so the very first
                // paint already shows the hand hidden/rotated behind the
                // avatar — same reasoning as DesktopDecorEntrance's
                // baked-in off-screen transform. The effect's immediate
                // gsap.set() above then just registers this exact value
                // with GSAP so its later fromTo() (see the deferred
                // ScrollTrigger setup) recognizes it as the current
                // state instead of jumping from some other default.
                transform: `rotate(${hand.initialRotation}deg)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
