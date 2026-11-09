"use client";

import { useEffect, useRef } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { onPreloaderComplete } from "@/lib/preloaderSignal";
import { heroEntranceDelay } from "@/lib/heroEntranceTiming";
import { TABLET_AVATAR_W, TABLET_AVATAR_H, TABLET_AVATAR_TOP } from "@/lib/tabletHeroSizing";

// Tablet counterpart to HandsReveal.tsx (desktop) — same six hands, same
// relative composition, scaled to fit the tablet avatar's own fluid
// (clamp()-based) box instead of desktop's fixed 614x754 one.
//
// Per request, this now auto-plays a rotate-in reveal once the hero
// appears (right after the greeting/headline finish, heroEntranceDelay(2))
// instead of desktop's scroll-scrubbed one and instead of the earlier
// "fixed at final position always, no animation" version — so this is a
// "use client" component again (it briefly went back to being a plain
// Server Component when there was no animation at all). Unlike desktop
// there's no ScrollTrigger/scroll-position math here at all, just a plain
// timed gsap.to per hand, since "automatically" here means "on load", not
// "as you scroll".
const FRAME_REF = 614;

function scaled(desktopPx: number): string {
  return `calc(${TABLET_AVATAR_W} * ${(desktopPx / FRAME_REF).toFixed(4)})`;
}

// Per request, tablet's hands start their reveal already most of the way
// open — 80% of the way from initialRotation to finalRotation — rather
// than from the full initialRotation desktop's HandsReveal.tsx uses (a
// much smaller sweep than desktop's full 180deg-to-0 one). 0 = starts at
// the full initialRotation (desktop's own throw), 1 = starts already at
// finalRotation (no visible movement at all); tune this one constant to
// adjust how much of the sweep is visible. Only the STARTING pose
// changes; finalRotation (where the tween ends, always 0) is untouched,
// so this only shortens the reveal's throw, not its endpoint.
const START_PROGRESS = 0.8;

function startRotation(hand: HandConfig): number {
  return hand.initialRotation + START_PROGRESS * (hand.finalRotation - hand.initialRotation);
}

type Anchor = "left" | "right";

type HandConfig = {
  src: string;
  anchor: Anchor;
  offset: number; // desktop px — converted to a scaled() calc() at render
  top: number; // desktop px — converted to a scaled() calc() at render
  width: number; // desktop px (already baseWidth*scale) — converted at render
  height: number; // desktop px — converted at render
  // Rotation pivot, as a plain CSS position inside this hand's own box —
  // same values as HandsReveal.tsx's own anchorX/anchorY for the same
  // hand (percentages don't need any FRAME_REF scaling, unlike offset/
  // top/width/height above: they're already relative to the hand's own
  // rendered box, whatever size that resolves to here).
  anchorX: string;
  anchorY: string;
  // Same per-hand endpoints as desktop's HANDS array — initialRotation is
  // desktop's own fully-hidden-behind-the-avatar pose, finalRotation
  // (always 0 here, like desktop) is where it settles once the auto-
  // reveal below plays. Tablet doesn't actually START from
  // initialRotation itself though — see startRotation() above, which
  // starts the reveal already halfway open instead of from the full
  // desktop throw.
  initialRotation: number;
  finalRotation: number;
};

// Same six hands, same final resting position, and now the same per-hand
// rotation pivot/sweep as desktop's HANDS array — width/height here are
// desktop's already-computed baseWidth*scale values (handSize()'s output)
// rather than baseWidth+scale separately, since this component only ever
// needs the final desktop px size to convert into a tablet ratio, not the
// scale knob itself.
const HANDS: HandConfig[] = [
  {
    src: "/images/Hand with photo show cards.webp",
    anchor: "right",
    offset: 460,
    top: 60,
    width: 289,
    height: 379.83,
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
    width: 383.8,
    height: 276.56,
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
    width: 418,
    height: 239.04,
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
    width: 279,
    height: 423.35,
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
    width: 380,
    height: 317.17,
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
    width: 380,
    height: 175.3,
    anchorX: "0%",
    anchorY: "35%",
    initialRotation: 180,
    finalRotation: 0,
  },
];

export default function TabletHandsReveal() {
  const handRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    // Registers each hand's starting rotation with GSAP right away — matches
    // the baked-in inline `transform: rotate(...)` on each <img> below
    // exactly, so this is a no-op visually, not a jump (same reasoning as
    // HandsReveal.tsx's own identical guard against a snap-on-load bug).
    HANDS.forEach((hand, i) => {
      const el = handRefs.current[i];
      if (el) gsap.set(el, { rotation: startRotation(hand) });
    });

    let ctx: ReturnType<typeof gsap.context> | undefined;
    const unsubscribe = onPreloaderComplete(() => {
      if (isReducedMotion()) {
        HANDS.forEach((hand, i) => {
          const el = handRefs.current[i];
          if (el) gsap.set(el, { rotation: hand.finalRotation });
        });
        return;
      }

      ctx = gsap.context(() => {
        // A plain timed reveal (no ScrollTrigger/scroll math at all) —
        // per request this plays automatically once the hero appears
        // rather than tracking scroll position like desktop's does.
        // heroEntranceDelay(0): starts in the same instant as
        // TabletHeadlineReveal's greeting/headline reveal (also (0)), per
        // request — the two run concurrently rather than hands waiting
        // for the text to finish first. An earlier pass pushed this to
        // (6) (after the headline settles) to dodge a jank issue from
        // that overlap; the willChange/force3D below (added at the same
        // time) turned out to be what actually fixed the jank, so
        // starting together again here doesn't reintroduce it — see the
        // frame-timing check in this component's own history for the
        // measurement. A small per-hand stagger (rather than all six
        // snapping open in the same instant) reads as the hands unfurling
        // out from behind the avatar one after another.
        HANDS.forEach((hand, i) => {
          const el = handRefs.current[i];
          if (!el) return;
          gsap.to(el, {
            rotation: hand.finalRotation,
            duration: 1,
            ease: "power2.out",
            delay: heroEntranceDelay(0) + i * 0.08,
            force3D: true,
            // Cleared once the tween finishes — will-change is meant to be
            // a short-lived hint for an imminent animation, not a
            // standing promise; leaving it on indefinitely just keeps six
            // large images pinned to their own GPU layers for the rest of
            // the page's life for no further benefit.
            onComplete: () => gsap.set(el, { clearProps: "willChange" }),
          });
        });
      });
    });

    return () => {
      unsubscribe();
      ctx?.revert();
    };
  }, []);

  return (
    <div
      // Positioned to share the avatar's EXACT box (top/width/height all
      // matching the avatar div's own values in GradientHero.tsx) — same
      // "hands and avatar occupy the identical coordinate frame" approach
      // as desktop's HandsReveal, just with tablet's fluid clamp() values
      // instead of desktop's fixed 46px/614px/754px.
      className="pointer-events-none absolute left-1/2 z-[8] -translate-x-1/2 select-none"
      style={{ top: TABLET_AVATAR_TOP, width: TABLET_AVATAR_W, height: TABLET_AVATAR_H }}
    >
      {HANDS.map((hand, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size
        <img
          key={hand.src}
          ref={(el) => {
            handRefs.current[i] = el;
          }}
          src={hand.src}
          alt=""
          aria-hidden="true"
          className="absolute select-none"
          style={{
            [hand.anchor]: scaled(hand.offset),
            top: scaled(hand.top),
            width: scaled(hand.width),
            height: scaled(hand.height),
            transformOrigin: `${hand.anchorX} ${hand.anchorY}`,
            // Baked in directly (present in the server-rendered HTML, not
            // applied only after JS/GSAP runs) so the very first paint
            // already shows the hand at its (halfway-open) starting pose —
            // same reasoning as HandsReveal.tsx's own baked-in transform,
            // just from startRotation() instead of the full initialRotation.
            transform: `rotate(${startRotation(hand)}deg)`,
            // Promotes each hand to its own compositor layer ahead of
            // time, before the rotation tween starts — without this the
            // browser was doing that layer promotion AT the start of the
            // animation instead, which is exactly the kind of main-thread
            // work that reads as a stutter right as six large images
            // begin rotating at once. Cleared once each tween finishes
            // (see onComplete below) since will-change is meant to flag
            // an imminent animation, not hold a standing GPU layer for
            // the rest of the page's life.
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
