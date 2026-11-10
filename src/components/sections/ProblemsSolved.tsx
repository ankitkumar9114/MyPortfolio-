import CaseStudiesForScreen from "./CaseStudiesForScreen";

// "Problems Which I Solved" — the second section of the page, right after
// the hero. The heading/divider block below is one shared implementation
// with responsive (phone vs tablet+) sizing baked into its own classes
// rather than three fully separate variants — only sizes/widths differ by
// breakpoint here, not structure/content, unlike the hero. The card stack
// further down, though, genuinely is three separate components (phone
// gets PhoneCaseStudyCard/PhoneCaseStudyStack, tablet gets
// TabletCaseStudyCard/TabletCaseStudyStack) — Figma specced a distinct
// composition per breakpoint (phone stacks top-to-bottom; tablet is
// side-by-side like desktop but at its own bespoke size/type-scale, not a
// uniform transform of desktop's numbers), same reasoning as the hero's
// own three-variant split.
//
// No background image here: body's own wall texture (see globals.css)
// already tiles vertically starting right where the hero ends, precisely
// so any section stacked after it — this one included — shows through
// with zero extra wiring. minHeight (not a fixed height) is 1210px,
// matching Wall Image.png's own native 1440x1210 frame — a fixed height
// would clip the card stack below, which needs the section to grow well
// past 1210px (its sticky-card scroll effect needs real page height to
// scroll through).
//
// Heading ("Frame 59" in Figma) + "featured works" divider row are laid
// out in normal flow, not at Figma's own `position: absolute; top:
// 1599.27px` — that value is measured from the top of the whole Figma
// page (hero + this section together), and our hand-tuned hero doesn't
// end at exactly the same pixel height Figma's mockup does, so reusing it
// verbatim would drift out of alignment with where the hero/ribbon
// actually end on this real page. Every other value below (sizes, gaps,
// colors, fonts) IS lifted directly from Figma's spec — this is a first
// pass at exact desktop pixel values, same starting point the hero itself
// had before it grew responsive variants over time.
//
// marginTop (not padding — an earlier, smaller gap needed padding to go
// negative, which CSS doesn't allow) shifts the heading down from the
// section's own top edge so it sits a fixed 200px below the ribbon's
// green band specifically (per request), measured directly off the green
// band's real rendered edge at the heading's own horizontal center (the
// band is a big rotated rectangle — its axis-aligned bounding box bottom
// is way lower than where it actually crosses center, so this was
// measured with an actual pixel scan, not the box's geometry). Whatever
// the section's own natural top offset from the ribbon ends up being (it
// can drift as the hero/ribbon change), this margin is what's tuned —
// whoever revisits this should re-measure rather than assume the number
// carries over.
//
// The "I" in the heading isn't in Figma's own copied CSS (a per-character
// color override Figma's CSS export doesn't capture), but the reference
// screenshot clearly shows it picked out in red — per request, a radial
// gradient (center #C12A39 -> edge #4B070E, straight from Figma's own
// gradient panel) via background-clip: text rather than a flat color.
const I_GRADIENT = "radial-gradient(circle, #C12A39 0%, #4B070E 100%)";

export default function ProblemsSolved() {
  return (
    <section id="work" className="relative w-full" style={{ minHeight: "1210px" }}>
      <div className="flex flex-col items-center" style={{ marginTop: "24px" }}>
        {/* Width/gap here go responsive (phone vs tablet+) alongside the
            font-size changes below — a bare font-size change alone would
            still leave this column at its fixed 659px/637px desktop
            widths, badly overflowing any phone viewport regardless of how
            small the text got. Exact phone width/gap numbers weren't
            given (only the font sizes were, per request), so these are a
            reasonable fit rather than a Figma-exact value — flag it if a
            specific phone spec exists for this block.

            tablet:w-[659px] used to jump straight to that fixed width the
            instant the tablet breakpoint (425px) kicked in — 659px on a
            425px-wide screen overflowed the page by well over 200px, a
            real bug found while verifying the tablet card's own
            responsiveness. clamp() instead: 64.36vw is 659px's own share
            of 1024px (tablet's upper bound), so it lands on exactly 659px
            there and shrinks smoothly underneath it, floored at 340px
            (matching the phone value) so it never gets smaller than that
            even right at 425px.

            The heading/"featured works" font-sizes just below now have
            an explicit desktop: tier too (not just tablet:), per
            request — tablet: alone has no upper bound in this project's
            breakpoint setup, so it was quietly setting desktop's own
            font-size as well; desktop: (1025px+) now restores desktop's
            original 72px/28px on top of tablet's new smaller 48px/20px. */}
        <div className="flex w-[min(90vw,340px)] flex-col items-center gap-3 tablet:w-[clamp(340px,64.36vw,659px)] tablet:gap-[20px] desktop:gap-[28px]">
          <h2
            className="w-full text-center font-[family-name:var(--font-arvo)] font-bold uppercase text-[#29292A] text-[36px] tablet:text-[48px] desktop:text-[72px]"
            style={{
              lineHeight: "105%",
              letterSpacing: "-0.02em",
            }}
          >
            Problems Which{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: I_GRADIENT }}
            >
              I
            </span>{" "}
            Solved
          </h2>

          <div className="flex w-auto flex-row items-center gap-4 tablet:w-auto tablet:gap-[48px] desktop:w-[clamp(300px,62.2vw,637px)]">
            <div className="h-[2px] w-[12vw] flex-none tablet:w-[10vw] tablet:flex-none desktop:flex-1" style={{ background: "#616161" }} />
            <p
              className="whitespace-nowrap font-[family-name:var(--font-serif)] font-bold text-[16px] tablet:text-[20px] desktop:text-[28px]"
              style={{ lineHeight: "105%", letterSpacing: "0.04em", color: "#353232" }}
            >
              featured works
            </p>
            <div className="h-[2px] w-[12vw] flex-none tablet:w-[10vw] tablet:flex-none desktop:flex-1" style={{ background: "#616161" }} />
          </div>
        </div>
      </div>

      {/* Gap below the heading block, per request — kept as its own
          margin rather than folded into the heading block's own
          green-band-relative marginTop above, so the two spacings can be
          retuned independently. This is now the ONLY thing controlling
          that gap — ImagesScrollingAnimation's own top padding and its
          first card's resting offset were both removed (see that file's
          comments) since they were a second, stacking source of the same
          gap, blowing it out past the intended value.

          32px on phone, 32px on tablet (per request), 72px on desktop —
          three explicit tiers now (mt-8 tablet:mt-[32px]
          desktop:mt-[72px]) rather than "tablet:" alone, since Tailwind's
          tablet: has no upper bound and was quietly setting desktop's
          value too; same reasoning as the heading/divider font-size
          tiers just below. This is purely a static page-layout margin
          sitting ABOVE each breakpoint's own scroll container, so
          changing it just moves that container (and everything in it) up
          or down the page as a whole; it doesn't touch any stack's own
          animation mechanics (sticky top offset, per-card cascade, scale
          ranges are all untouched) — only when, at what scroll depth,
          that unchanged animation starts playing.

          Per request, the card design below is now a genuine three-way
          split — phone/tablet/desktop each get their own stack component,
          and only the one for this screen is built (CaseStudiesForScreen).
          Desktop's own stack is CaseStudyCarousel (a pinned sideways
          carousel with bent side cards). */}
      <div className="mt-8 tablet:mt-[32px] desktop:mt-[72px]">
        <CaseStudiesForScreen />
      </div>
    </section>
  );
}
