"use client";

import { useCaseStudies } from "@/lib/caseStudies";
import { CARD_LIFT_SHADOW } from "./CaseStudyCarousel";
import PhoneCaseStudyCard, { PHONE_CARD_HEIGHT_CSS } from "./PhoneCaseStudyCard";

// Phone case studies: the cards simply listed one under another (no sticky
// stacking or scroll animation on phone, per request). Desktop and tablet
// keep their own animated stacks (CaseStudyCarousel / TabletCaseStudyStack).
const CARD_GAP = 24; // px between cards
const BOTTOM_GAP = 60; // px below the last card, before "Impact in Numbers"

export default function PhoneCaseStudyStack() {
  const cards = useCaseStudies(); // live from the /admin CRM (Firebase)
  return (
    // the size container: PHONE_CARD_HEIGHT_CSS is in cqw of this row's
    // width, so each card's height follows its width (image keeps its shape)
    <main className="flex w-full flex-col px-4 [container-type:inline-size]" style={{ gap: CARD_GAP, paddingBottom: BOTTOM_GAP }}>
      {cards.map((card) => (
        <div
          key={card.id}
          className="w-full overflow-hidden"
          // lift shadow on this wrapper (the card's own overflow-hidden would
          // clip a box-shadow); rounded like the card so it follows the corners
          style={{ height: PHONE_CARD_HEIGHT_CSS, filter: CARD_LIFT_SHADOW, borderRadius: "12px" }}
        >
          <PhoneCaseStudyCard study={card} />
        </div>
      ))}
    </main>
  );
}
