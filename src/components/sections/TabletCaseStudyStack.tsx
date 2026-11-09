"use client";

import { useCaseStudies, type CaseStudy } from "@/lib/caseStudies";
import { CARD_LIFT_SHADOW } from "./CaseStudyCarousel";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import TabletCaseStudyCard, { TABLET_CARD_HEIGHT } from "./TabletCaseStudyCard";

// Tablet counterpart to images-scrolling-animation.tsx (desktop) and
// PhoneCaseStudyStack.tsx (phone) — per request, a genuinely separate
// component so neither sibling stack is touched by tablet-specific
// tuning. Same sticky + scroll-driven scale mechanism as both (see
// images-scrolling-animation.tsx for the underlying technique and the
// Lenis-conflict reasoning, identical here). Width is fluid (100%, see
// the motion.div below) rather than TabletCaseStudyCard's old fixed
// 655px — per request, same "reflow with whatever width the sticky
// container's own padding leaves available" fix phone's stack already
// got, since a literal 655px card overflowed the narrow end of the
// tablet range.

const StickyTabletCard = ({
  i,
  study,
  progress,
  range,
  targetScale,
}: {
  i: number;
  study: CaseStudy;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
}) => {
  const container = useRef<HTMLDivElement>(null);

  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div
      ref={container}
      // top-[100px], not top-0 — the tablet header pill sits at mt-8
      // (32px) + its own height (25.2-56px depending on where in the
      // tablet range it's scaled to, see Header.tsx), so this clears it
      // comfortably across the whole range — same "give the pinned card
      // room to clear the header" reasoning as the desktop/phone stacks'
      // own top offsets. px-8 (32px, per request) — not phone's own px-4
      // (16px) — since this card's own width is 100% of whatever this
      // padding leaves available (see the motion.div below), this is the
      // single source of the card's side margins.
      className="sticky top-[100px] flex items-center justify-center px-8"
    >
      <motion.div
        style={{
          scale,
          // lift shadow on this wrapper: its overflow-hidden would clip
          // the card's own box-shadow
          filter: CARD_LIFT_SHADOW,
          // same rounding as the card, so the overflow-hidden clip (and the
          // card's shadow cut off by it) follows the rounded corners instead
          // of leaving a dark square behind each corner
          borderRadius: "6.79343px",
          // Per-card cascade offset, doubled to 24px/card per request
          // (was 12px) — same doubling applied to desktop's and phone's
          // own per-card offsets.
          top: `${i * 24}px`,
          // Fluid width, filling the sticky container's own available
          // width (that container's px-8 already reserves 32px on each
          // side, so this just inherits that margin rather than needing a
          // second copy of the number here) — TabletCaseStudyCard itself
          // is w-full, so the whole card (and its text column) reflows
          // with it instead of overflowing on narrow tablets or leaving
          // dead space on wide ones.
          width: "100%",
          height: `${TABLET_CARD_HEIGHT}px`,
        }}
        className="relative -top-1/4 flex origin-top flex-col overflow-hidden"
      >
        <TabletCaseStudyCard study={study} />
      </motion.div>
    </div>
  );
};

export default function TabletCaseStudyStack() {
  const cards = useCaseStudies(); // live from the /admin CRM (Firebase)
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  return (
    // pb-[50vh] used to be a vh-based scroll runway, then a flat 100px —
    // both wrong the same way desktop's own pb was: this padding is
    // measured from each card's own ".sticky" WRAPPER, but the wrapper's
    // getBoundingClientRect() doesn't reflect where the card actually
    // paints. The inner motion.div is `position: relative` with an
    // inline `top: ${i*24}px` (this stack's own per-card cascade offset,
    // below) — relative positioning shifts the element visually without
    // changing its parent's layout box, so the real, visible last card
    // (i=4) renders 4*24=96px BELOW the wrapper's own reported edge.
    // pb-[100px] was measured against that wrong, unshifted edge, so the
    // real gap to the actually-visible card was only 100-96=4px —
    // confirmed by measuring the actual card div directly instead of its
    // wrapper. pb-[196px] (100 + 96) restores an actual 100px gap to the
    // real, visible card edge — same fix, same reasoning, as the desktop
    // stack's own pb-[220px] in images-scrolling-animation.tsx.
    <main ref={container} className="relative flex w-full flex-col justify-center pb-[196px]">
      {cards.map((card, i) => {
        const targetScale = Math.max(0.6, 1 - (cards.length - i - 1) * 0.08);
        return (
          <StickyTabletCard
            key={card.id}
            i={i}
            study={card}
            progress={scrollYProgress}
            range={[i / cards.length, 1]}
            targetScale={targetScale}
          />
        );
      })}
    </main>
  );
}
