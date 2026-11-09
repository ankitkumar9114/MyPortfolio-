import CaseStudyCopy from "./CaseStudyCopy";
import CaseStudyImage, { IMAGE_ASPECT } from "./CaseStudyImage";
import CaseStudyCardLink from "./CaseStudyCardLink";
import { DEFAULT_CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";
// Tablet counterpart to CaseStudyCard.tsx (desktop) and
// PhoneCaseStudyCard.tsx (phone) — per request, a genuinely separate
// component at Figma's own tablet spec (655x277.4), not a scaled copy of
// either sibling: side-by-side like desktop (unlike phone's stacked
// layout), but at its own bespoke size/type-scale rather than a uniform
// transform of desktop's 1200x510 (the numbers don't reduce to one clean
// ratio — e.g. the heading is 24px here vs desktop's 41.5557px, a ~0.577
// ratio, while the card itself is 655/1200 ≈ 0.546 — closer to the
// "genuinely different composition per breakpoint" pattern the hero
// itself uses than a mechanical scale-down). Desktop's CaseStudyCard.tsx
// and phone's PhoneCaseStudyCard.tsx are both untouched.
//
// Width is fluid (100%, not the original fixed 655px) per request — same
// motivation as phone's own fluid-width follow-up: a literal 655px card
// overflowed the narrow end of the tablet range (425px+).
//
// The white placeholder box and the text column are BOTH percentage-based
// (of this card's own now-fluid width) rather than one fixed + one
// calc(100% - Npx) — a first attempt kept the image box a fixed 280px and
// only let the text column absorb the rest, but at 425px that squeezed
// the text column down to ~36px: too narrow for ordinary words ("primary",
// "streamlined") to wrap at all, so they visually overflowed the card and
// caused real page-level horizontal scroll — a worse bug than the one
// being fixed. Every horizontal (left/width) number below for the image
// box and text column is instead that original value's own percentage of
// 655px (e.g. 280/655 = 42.748%), so both columns shrink and grow
// TOGETHER in the same proportions the 655px design had, all the way down
// to 425px — at that width the text column comes out to ~194px, plenty
// of room to wrap normally. The button's `left` follows the text column's
// same percentage so it stays aligned under it at any width (its own
// width/height/padding stay fixed px — a small CTA control, not running
// text). Corner flourishes and the white box's height stay fixed px too —
// they're image content with their own intrinsic proportions.
export const TABLET_CARD_HEIGHT = 277.4;

export default function TabletCaseStudyCard({
  study = DEFAULT_CASE_STUDIES[1],
  focusable = true,
}: {
  study?: CaseStudy;
  focusable?: boolean; // false for decorative copies (no tab stops)
}) {
  const { background } = study;
  return (
    <div
      className="group/card relative w-full overflow-hidden"
      style={{
        height: `${TABLET_CARD_HEIGHT}px`,
        background,
        // no own box-shadow: every place the card is shown clips it to a
        // square (leaving dark patches behind the rounded corners); the
        // stack/carousel adds a drop-shadow (CARD_LIFT_SHADOW) that follows
        // the curve instead
        borderRadius: "6.79343px",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-soft-light"
        style={{ backgroundImage: "url('/images/Card bg.webp')" }}
      />

      {/* Rectangle 15 — blank placeholder for this case study's own
          screenshot/image. Rendered before (so, behind) the corner
          flourishes, same reasoning as the other two cards: the
          flourishes overlap onto this box's corners and need to paint on
          top of it. left/width are 22px/280px as a % of 655px. */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{
          // same 7:6 shape as desktop: 42.748% of the card wide, capped at
          // 240px tall (281.3px wide), vertically centered in the card
          left: "3.359%",
          top: "50%",
          translate: "0 -50%",
          width: `min(42.748%, ${240 * IMAGE_ASPECT}px)`,
          aspectRatio: IMAGE_ASPECT,
          borderRadius: "6.79343px",
        }}
      >
        <CaseStudyImage study={study} />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/Frame Corners.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{ width: "69.63px", height: "83.79px" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/Frame Corners.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 rotate-180 select-none"
        style={{ width: "69.63px", height: "83.79px", bottom: "2.83px" }}
      />

      <CaseStudyCopy
        study={study}
        s={{
          box: { left: "49.771%", top: "27.74px", bottom: "20px", width: "45.556%" },
          // tag text starts level with the image box's top edge
          topWithTags: "16px",
          gap: 12.45,
          titleSize: 24,
          titleLineHeight: 1.2,
          titleLines: 3,
          bodySize: 14,
          bodyLines: 5,
          bodyLinesWithTags: 3,
          tagSize: 11,
          linkSize: 13,
        }}
      />
      <CaseStudyCardLink study={study} focusable={focusable} />
    </div>
  );
}
