// "Impact in Numbers" — the third section of the page, right after
// "Problems Which I Solved". No background image of its own (per
// request, "continue the same bg") — same reasoning as ProblemsSolved's
// own lack of one: body's wall texture (see globals.css) already tiles
// vertically for however tall the page ends up being, so any section
// stacked after the hero shows through with zero extra wiring.
//
// Two pieces: the heading row ("Frame 57" in Figma, built first) — a
// small centered cluster (a short fixed-width line, the title, another
// line), NOT a full-width divider like "Problems Which I Solved"'s own
// "featured works" row (that one used flex-1 lines spanning the whole
// heading block's width; this one's lines are a fixed 160px at desktop
// per spec, so the whole cluster is only as wide as its own content and
// sits centered in the section) — and the stat-card row below it
// ("Frame 56"), four cards each using raw-images/Imapact card design.svg
// (copied to public/graphics/impact-card.svg) as their decorative
// scalloped-sticker frame.
//
// Desktop values are Figma-exact (32px heading font, 160px lines, 48px
// gap; 395x203px cards, 40px gap). Tablet/phone don't have a spec yet
// for either piece, so their sizing is a reasonable scaled-down estimate
// (same ratio-of-desktop approach used for this page's other headings)
// rather than Figma-exact values — flag it if a specific tablet/phone
// spec exists. whitespace-nowrap keeps "Impact in Numbers" on one line
// at every size; the line widths shrink enough at phone width that the
// whole cluster still fits without horizontal overflow (verified at
// 320px).
//
// Per request, the card row auto-rotates horizontally in a single line
// (a looping marquee, see STAT_CARDS/StatCardLap below) rather than
// sitting static — this replaced an earlier static layout entirely
// (desktop's own full-bleed 1700px row, cropped at the viewport edges,
// plus a wrapping 2-up/1-up fallback grid for tablet/phone), not just a
// new option alongside it.
//
// Figma's "Line 3" (the left line) has an extra `transform: matrix(-1, 0,
// 0, 1, 0, 0)` — a horizontal flip. Skipped here: flipping a plain solid
// horizontal line has no visual effect (it's symmetric), so it's almost
// certainly just an artifact of Figma mirroring one line asset to make
// the other rather than a deliberate visual choice.
//
// Card copy is real text read off a reference screenshot, NOT the
// literal (duplicated-placeholder) CSS spec text — Figma's own dev-mode
// export had all four cards carrying the same "Lead full CRM
// design/for internal Team/IQOL" copy verbatim, which is clearly just
// one component instance's content leaking into the other three
// instances' export rather than each card's own real copy. The first
// card's leading digit(s) ("_0% Reduced") were cropped out of frame in
// that screenshot and unreadable — flagged below, needs the real number.
import ImpactMarqueeTrack from "./ImpactMarqueeTrack";

export default function ImpactInNumbers() {
  return (
    // .impact-section-shift (defined in globals.css, desktop-only media
    // query) — per request, the gap from the case-study stack to this
    // section's own VISIBLE heading line should be exactly 100px. The
    // stack's own trailing pb-[100px] (images-scrolling-animation.tsx)
    // already puts the heading row's bounding-box top exactly 100px
    // below the card, but the line sits vertically centered inside that
    // row's 48px height (line-height: 150% of the 32px heading font, per
    // Frame 57's own spec) — 23.5px below that box's own top edge — so
    // the visible line was actually landing at 123.5px.
    // A margin-based shift was tried first and reverted: negative
    // margin-top pulls content up but ALSO removes that same 23.5px from
    // the page's total document height, which cuts into the exact same
    // scroll runway the last sticky card needs to fully release (see
    // images-scrolling-animation.tsx's own comment) — confirmed it
    // reproduced the identical stuck-card overlap as shrinking that pb
    // directly did. A `translate-y` Tailwind utility was tried next
    // (paint-only, doesn't touch document height) but Tailwind silently
    // failed to generate any CSS for the arbitrary decimal value; hence
    // the plain class + real media query here instead. Applied to the
    // whole SECTION (not just the heading row) so adding the stat-card
    // row below doesn't silently grow the heading-to-cards gap by this
    // same 23.5px — both move up together, preserving Frame 58's own
    // 52px spec between them. Desktop-only per request; tablet/phone
    // have the same kind of offset (19px/13px, matching their own
    // smaller heading row heights) but weren't asked for yet.
    <section className="impact-section-shift relative w-full">
      <div className="flex flex-row items-center justify-center gap-4 px-4 tablet:gap-[48px] desktop:gap-12">
        <div
          className="tablet:hidden"
          style={{ width: "12vw", height: "1px", background: "#000000", flexShrink: 0 }}
        />
        <div
          className="hidden tablet:block desktop:hidden"
          style={{ width: "10vw", height: "1px", background: "#000000", flexShrink: 0 }}
        />
        <div
          className="hidden desktop:block"
          style={{ width: "160px", height: "1px", background: "#000000", flexShrink: 0 }}
        />

        <h2
          className="whitespace-nowrap text-center font-[family-name:var(--font-arvo)] font-normal text-[18px] tablet:text-[26px] desktop:text-[32px]"
          style={{ lineHeight: "150%", color: "#7C7C7C" }}
        >
          Impact in Numbers
        </h2>

        <div
          className="tablet:hidden"
          style={{ width: "12vw", height: "1px", background: "#000000", flexShrink: 0 }}
        />
        <div
          className="hidden tablet:block desktop:hidden"
          style={{ width: "10vw", height: "1px", background: "#000000", flexShrink: 0 }}
        />
        <div
          className="hidden desktop:block"
          style={{ width: "160px", height: "1px", background: "#000000", flexShrink: 0 }}
        />
      </div>

      {/* Frame 56 — the stat-card row, 52px below the heading (Frame 58's
          own spec), scaled down for tablet/phone same as everything else
          in this section. overflow-hidden is what makes this a proper
          marquee viewport (clips everything outside the visible band)
          instead of a page-breaking horizontal scrollbar. */}
      <div className="marquee-pause-on-hover mt-8 overflow-hidden tablet:mt-10 desktop:mt-[52px]">
        {/* moving track (cards from the CMS); its speed keeps the original
            80s per lap of 8 cards */}
        <ImpactMarqueeTrack />
      </div>
    </section>
  );
}
