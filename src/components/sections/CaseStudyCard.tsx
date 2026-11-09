import CaseStudyCopy from "./CaseStudyCopy";
import CaseStudyImage from "./CaseStudyImage";
import CaseStudyCardLink from "./CaseStudyCardLink";
import { DEFAULT_CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";
// First "featured works" case-study card ("Frame 2085664998" in Figma) —
// exact desktop pixel values for now, the same starting point every other
// piece of this page had before growing responsive breakpoint variants.
//
// The background pattern (Figma's "Rectangle 14"/"Frame 24", mix-blend-
// mode: soft-light) now uses the real provided asset (raw-images/Card
// bg.png, converted to webp via `npm run images:webp`) instead of the
// hero's own bg-pattern.webp tile that stood in for it earlier (that
// substitution was only ever a placeholder — Figma's own export wasn't
// available at the time). This asset is 1202x515, i.e. already sized to
// the card almost exactly, so it's rendered bg-no-repeat + bg-cover
// (fills the card as one image) rather than tiled like the old stand-in
// was. overflow-hidden on the card clips both this pattern and the
// corner flourishes to the card's own rounded corners.
//
// Corner flourishes (Figma's "image 55"/"image 56") both come from the
// one provided asset (raw-images/Frame Corners.png, converted to webp via
// `npm run images:webp`) — the top-left corner uses it as-is, the
// bottom-right one is the exact same image rotated 180deg, matching how
// Figma's own image56 is just image55 rotated rather than a distinct
// mirrored asset.
//
// `background` is a prop (not hardcoded) so this same card can render
// with different colors — used by images-scrolling-animation.tsx to show
// several of these stacked with distinct colors. Defaults to the
// original Figma maroon for any standalone usage.
//
// CARD_WIDTH/CARD_HEIGHT are exported (not just inlined below) because
// images-scrolling-animation.tsx needs this card's exact real size to
// build the wrapper it scales this card down to fit inside — that
// wrapper used to hardcode its own separate copy of these numbers, which
// meant changing the size here silently did nothing on the actual page
// (the wrapper's own stale copy kept clipping/scaling to the OLD size
// regardless). Importing these instead of copying them means a resize
// here always takes effect everywhere this card is used.
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 510;

export default function CaseStudyCard({
  study = DEFAULT_CASE_STUDIES[1],
  focusable = true,
}: {
  study?: CaseStudy;
  focusable?: boolean; // false for decorative copies (no tab stops)
}) {
  const { background } = study;
  return (
    <div
      className="group/card relative overflow-hidden"
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
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
        // The image URL is a plain inline style, not a Tailwind arbitrary
        // background-image class — Tailwind's arbitrary-value syntax
        // splits class lists on whitespace before parsing bracket
        // contents, so the literal space in "Card bg.webp" broke it
        // (silently produced no background-image at all); the usual
        // underscore-for-space escape doesn't get translated back inside
        // the url function either, so it just requested a literally-
        // nonexistent "Card_bg.webp". A plain style prop has no such
        // parsing step, so the real filename (with its real space) just
        // works. (Deliberately not spelling out the actual Tailwind
        // syntax here as literal text — Tailwind's content scanner reads
        // raw file text for anything that looks like a class, comments
        // included, and choked on it being written out plainly earlier.)
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-soft-light"
        style={{ backgroundImage: "url('/images/Card bg.webp')" }}
      />

      {/* Rectangle 15 — blank placeholder for this case study's own
          screenshot/image, same as the reference (nothing dropped in
          yet). Rendered BEFORE (so, behind) the corner flourishes below —
          the flourishes overlap onto this box's own corners, per the
          reference, so they need to paint on top of it, not get covered
          by it. */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{
          left: "40.52px",
          top: "34.28px",
          width: "516.33px",
          height: "440.49px",
          borderRadius: "12px",
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
        style={{ width: "127.78px", height: "153.76px" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/Frame Corners.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 rotate-180 select-none"
        style={{ width: "127.78px", height: "153.76px", bottom: "0.25px" }}
      />

      <CaseStudyCopy
        study={study}
        s={{
          // text column 32px right of the image box (556.85 + 32), from the
          // top padding down to 44px above the card's bottom edge
          box: { left: "588.85px", top: "50.91px", bottom: "44px", width: "547.5px" },
          // tag text starts level with the image box's top edge
          topWithTags: "29px",
          gap: 16,
          titleSize: 41.5557,
          titleLineHeight: 1.2,
          titleLines: 3,
          bodySize: 20.7779,
          bodyLines: 7,
          bodyLinesWithTags: 6,
          tagSize: 18,
          linkSize: 20,
        }}
      />
      <CaseStudyCardLink study={study} focusable={focusable} />
    </div>
  );
}
