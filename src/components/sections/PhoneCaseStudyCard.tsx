import CaseStudyCopy from "./CaseStudyCopy";
import CaseStudyImage, { IMAGE_ASPECT } from "./CaseStudyImage";
import CaseStudyCardLink from "./CaseStudyCardLink";
import { DEFAULT_CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";
// Phone counterpart to CaseStudyCard.tsx (desktop/tablet) — per request,
// a genuinely separate component (not a responsive version of the
// desktop one) at Figma's own phone spec: 290x479, everything inside
// re-laid-out top-to-bottom (image on top, text below) instead of
// side-by-side, since 290px isn't wide enough for the desktop layout to
// mean anything. Desktop/tablet's CaseStudyCard.tsx is untouched — this
// only ever renders on phone (see ProblemsSolved.tsx's own tablet:hidden
// gating on whichever stack wraps this).
//
// Width is fluid (100%, not a fixed 290px) per request — the card fills
// whatever width its parent gives it (PhoneCaseStudyStack.tsx hands it
// the sticky container's own full width, which already reserves a
// consistent 16px on each side via that container's own padding, so the
// margin stays 16px/16px at any phone width rather than needing a second
// copy of that number here). Height stays the fixed 479px from Figma —
// only width was asked to go responsive. The white placeholder box and
// the text column below both follow suit: `calc(100% - 32px)` at a fixed
// `left: 16px` reproduces their original 16px-inset-from-the-card-edge
// look at any card width, and everything nested inside them (the heading,
// the paragraph, the inner text/button column) is just `100%` of ITS OWN
// now-fluid parent, so the whole text block reflows with the card instead
// of clipping or leaving dead space at some widths. The button keeps its
// original fixed 140x41 — a small CTA control, not running text, so
// there's no "text width" reason for it to stretch with the card.
export const PHONE_CARD_HEIGHT = 523; // 479 designed + 44px extra room at the bottom (fits a 3-line title)
// The image box is full card width with the desktop card's 7:6 shape, so the
// card's height follows its width: 479px was designed around a 218px-tall
// box. 100cqw = the card's width (the phone stack's sticky row is the size
// container).
const IMAGE_BOX_H = `((100cqw - 32px) / ${IMAGE_ASPECT})`;
export const PHONE_CARD_HEIGHT_CSS = `calc(${PHONE_CARD_HEIGHT - 218}px + ${IMAGE_BOX_H})`;

export default function PhoneCaseStudyCard({
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
        height: PHONE_CARD_HEIGHT_CSS,
        background,
        // no own box-shadow: every place the card is shown clips it to a
        // square (leaving dark patches behind the rounded corners); the
        // stack/carousel adds a drop-shadow (CARD_LIFT_SHADOW) that follows
        // the curve instead
        borderRadius: "12px",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-soft-light"
        style={{ backgroundImage: "url('/images/Card bg.webp')" }}
      />

      {/* Rectangle 15 — blank placeholder for this case study's own
          screenshot/image. Rendered before (so, behind) the corner
          flourishes, same reasoning as desktop's card: the flourishes
          overlap onto this box's corners and need to paint on top of it. */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{ left: "16px", top: "16.47px", width: "calc(100% - 32px)", aspectRatio: IMAGE_ASPECT, borderRadius: "4px" }}
      >
        <CaseStudyImage study={study} />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/Frame Corners.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{ width: "64px", height: "77.01px" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/Frame Corners.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 rotate-180 select-none"
        style={{ width: "64px", height: "77.01px" }}
      />

      <CaseStudyCopy
        study={study}
        s={{
          box: { left: "16px", top: `calc(16.47px + ${IMAGE_BOX_H} + 16px)`, bottom: "28px", width: "calc(100% - 32px)" },
          gap: 10,
          titleSize: 20,
          titleLineHeight: 1.5,
          titleLines: 3,
          bodySize: 14,
          bodyLines: 5,
          bodyLinesWithTags: 4,
          tagSize: 12,
          linkSize: 14,
        }}
      />
      <CaseStudyCardLink study={study} focusable={focusable} />
    </div>
  );
}
