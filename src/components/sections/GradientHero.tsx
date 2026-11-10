import type { CSSProperties } from "react";
import MobileAvatarToggle from "./MobileAvatarToggle";
import AvatarHint from "./AvatarHint";
import MarqueeRibbons from "./MarqueeRibbons";
import DesktopMarqueeRibbons from "./DesktopMarqueeRibbons";
import TabletMarqueeRibbons from "./TabletMarqueeRibbons";
import HandsReveal from "./HandsReveal";
import DesktopDecorEntrance from "./DesktopDecorEntrance";
import DesktopHeadlineReveal from "./DesktopHeadlineReveal";
import TabletHandsReveal from "./TabletHandsReveal";
import TabletHeadlineReveal from "./TabletHeadlineReveal";
import PhoneHeadlineReveal from "./PhoneHeadlineReveal";
import { TABLET_AVATAR_W, TABLET_AVATAR_H, TABLET_AVATAR_TOP } from "@/lib/tabletHeroSizing";

// Tablet (425-1024px) sizing — each a clamp(min, preferred-vw, max) where
// the vw term is that element's own ratio to the desktop 1440 reference
// (e.g. the corner is 78px at 1440, so 78/1440 = 5.417vw), bounded so nothing
// gets illegibly small at 425px or absurdly large at 1024px. This isn't a
// scaled copy of either sibling layout — see the comment above the section
// itself for why a genuine third composition, not degraded mobile/desktop,
// is what the 425-1024 range actually needs.
//
// TABLET_AVATAR_W/H/TOP live in lib/tabletHeroSizing.ts instead of here —
// TabletHandsReveal.tsx needs the exact same values to scale the six hands
// against the avatar's own box without drifting out of alignment with it,
// so they're a single shared source now rather than copies that could
// silently diverge.
const TABLET_CORNER_W = "clamp(34px, 5.417vw, 62px)";
const TABLET_CORNER_H = "clamp(40px, 6.389vw, 73px)";
const TABLET_BORDER_T = "clamp(11px, 1.458vw, 17px)";
// Fixed (not a vw-scaled clamp like its siblings above) per exact spec.
const TABLET_RING_W = "180px";
const TABLET_RING_H = "180px";

// First pass at the new Figma design (node 1:85): a radial gradient block,
// 1440px tall, matching the two gradient stops from the "Stops" panel
// (0% #960D1A -> 100% #4D050C), plus the "Spiral" light-ray graphic centered
// on top of it (Figma: x=-570, width=2579 against a 1440-wide frame, i.e.
// centered and overhanging both edges). Rest of the hero content comes next.
//
// This renders THREE independent variants gated purely by visibility
// classes, using the named breakpoints registered in globals.css (phone
// <425px, tablet 425-1024px, desktop 1025px+): the original desktop
// markup (`hidden desktop:block`), a genuinely separate tablet
// composition (`hidden tablet:block desktop:hidden` — not a scaled copy
// of either sibling, since neither degrades well across the full
// 425-1024px range on its own), and the phone reconstruction of Figma
// node 40:5685 (`tablet:hidden`, i.e. visible only below 425px now). Only
// one ever renders at a time, so there's no shared-layout risk between
// them.
export default function GradientHero() {
  return (
    <>
      <section className="relative hidden w-full overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#960D1A_0%,_#4D050C_100%)] desktop:block">
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
      <img
        src="/graphics/spiral-header.svg"
        alt=""
        aria-hidden="true"
        width={2579}
        height={2078}
        className="pointer-events-none absolute left-1/2 top-0 z-0 w-[280vw] max-w-none -translate-x-1/2 -translate-y-[22%] animate-spin-slow select-none"
      />

      {/* Damask pattern tile (306x335), repeated to cover the whole section.
          Sits above the gradient+spiral but below the border/corner frame so
          the soft-light blend reacts with the red tones underneath while the
          frame graphics stay crisp and unaffected. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[url('/images/bg-pattern.webp')] bg-repeat opacity-50 mix-blend-soft-light"
      />

      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/top-corner.webp"
        alt=""
        aria-hidden="true"
        width={78}
        height={92}
        className="pointer-events-none absolute left-0 top-0 z-10 h-[92px] w-[78px] select-none"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/top-corner.webp"
        alt=""
        aria-hidden="true"
        width={78}
        height={92}
        className="pointer-events-none absolute right-0 top-0 z-10 h-[92px] w-[78px] scale-x-[-1] select-none"
      />

      {/* Repeating border strip, inset exactly by the corner-image width on
          each side so it fills the gap between them without ever crossing
          under/over either corner graphic. bg-repeat-x tiles + auto-clips
          the trailing partial tile at any viewport width — no JS needed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[78px] right-[78px] top-0 z-10 h-[21px] bg-[url('/images/border.webp')] bg-left-top bg-repeat-x"
      />

      {/* Same idea, rotated: border-vertical.webp is border.webp pre-rotated
          90° (21x345) so the pattern flows top-to-bottom instead of being a
          sideways horizontal strip. Inset from top by the corner height so
          it starts right where the corner graphic ends, and bottom-0 so it
          always runs to the end of the red section, however tall that is.
          left-[6px]: top-corner.webp has ~5-6px of transparent padding baked
          into its left edge, so the ornament's visible line doesn't actually
          start at x=0 — this nudges the strip in to meet it. The mirrored
          right corner has that padding flipped to its right edge instead, so
          the right strip needs no equivalent offset. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8px] top-[92px] bottom-0 z-10 w-[21px] bg-[url('/images/border-vertical.webp')] bg-left-top bg-repeat-y"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[92px] bottom-0 z-10 w-[21px] bg-[url('/images/border-vertical.webp')] bg-right-top bg-repeat-y"
      />

      {/* Grandma, sunflowers, elephant, and the "dekho magar pyar se"
          sticker — now a "use client" component (DesktopDecorEntrance.tsx)
          instead of static <img> tags, since each slides in from
          off-screen (whichever edge it bleeds off) once on page load. See
          that file for the entrance animation; positions/sizes/z-index are
          unchanged from before this was split out. */}
      <DesktopDecorEntrance />

      {/* Lemon-and-chili charm, centered, hanging from the top. z-[8] sits
          below the border/corners (z-10) and the fixed Header (z-50), so its
          thread appears to emerge from behind them, but above the gradient/
          spiral/pattern (z-0 / z-[5]) so it's fully visible against the bg. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/lemon.webp"
        alt=""
        aria-hidden="true"
        width={72}
        height={189}
        className="pointer-events-none absolute left-1/2 top-3 z-[8] h-[194.90625px] w-[74.25px] -translate-x-1/2 select-none"
      />

      {/* "Hi, I'm Ankit" greeting + the big headline below it, as one
          centered column so the 16px gap between them is a real flex gap
          (robust to actual font metrics) rather than two independently
          guessed absolute offsets.

          This column is normal flow now (mt-[260px] instead of
          absolute+top-[260px]) rather than absolutely positioned over the
          section — same reason as the mobile/tablet variants: the section
          itself has no explicit height and instead auto-sizes to wherever
          this content actually ends (text, ring, then avatar), so growing
          the frame or narrowing it enough to wrap the headline further
          both just grow the section instead of clipping or leaving a gap.
          w-max + mx-auto sizes the box to its content's natural width and
          centers it, since a plain block child would otherwise stretch to
          the section's full width. No z-index on this wrapper (so it
          doesn't start a new stacking context — the ring/avatar below
          still compare their own z-[7]/z-[9] directly against the
          border's z-10, lemon's z-8, etc. in the section's stacking
          context, same as before it was restructured). The ring/avatar
          are absolutely positioned within it at calc(100% + gap), tracking
          the greeting+headline's real height directly instead of sitting
          at fixed top-N guesses — that's what keeps the header-to-
          headline-to-ring-to-avatar spacing constant as the frame narrows
          and the (fixed-font, fixed-228px-margin) headline wraps to more
          lines: everything below it shifts down by exactly as much as the
          headline grew, rather than drifting out of position. */}
      <div className="relative mx-auto mt-[260px] w-max">
        {/* "Hi, I'm Ankit" greeting + big headline — now a "use client"
            component (DesktopHeadlineReveal.tsx) instead of static markup,
            since it fades + slides up into place once the Preloader
            finishes. See that file for the animation; markup/positioning/
            font specs are unchanged from before this was split out. */}
        <DesktopHeadlineReveal />

        {/* Ring+avatar wrapper — normal flow (mt-[78px], matching the
            ring's own original gap off the headline) rather than
            absolutely positioned, same as the greeting+headline column
            above it: an absolutely positioned element (which the ring and
            avatar both are, since they need to overlap and be independently
            centered) never contributes to an ancestor's auto-height, so if
            THIS wrapper were also absolute, the section would auto-size to
            only the headline's height and clip the ring/avatar entirely.
            Explicit h-[800px] = 46 (avatar's own 124px gap, minus this
            wrapper's 78px starting gap) + 754 (avatar height) — i.e. tall
            enough to span from the ring's top to the avatar's bottom,
            which is what actually determines the section's real height
            now. mx-auto: the outer column is w-max, sized to its widest
            child — the headline (calc(100vw-456px), much wider than this
            614px-wide wrapper in practice) — so without mx-auto this
            narrower block would sit flush left inside that wider column
            instead of centered under the headline. */}
        <div className="relative mx-auto mt-[78px] h-[800px] w-[614px]">
          {/* "3+ years of experience" ring, centered behind the cartoon's
              head. z-[7]: above the pattern/spiral (z-0/z-[5]) but below
              the cartoon (z-[9]), so his head renders on top of it rather
              than the ring covering his face. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
          <img
            src="/graphics/experience-badge.svg"
            alt=""
            aria-hidden="true"
            width={323}
            height={322}
            className="pointer-events-none absolute left-1/2 top-0 z-[7] h-[322px] w-[323px] -translate-x-1/2 select-none"
          />

          {/* Six-armed "master of tools" hands — now a "use client"
              component (HandsReveal.tsx) instead of static <img> tags,
              since they need real scroll-driven behavior: hidden (rotated
              180deg around their avatar-side anchor edge) when the site
              first loads, rotating to their final position as the avatar
              scrolls into the main viewport. See that file for the
              anchor/scroll-scrub reasoning and the exact per-hand
              positions (unchanged from before this was split out). */}
          <HandsReveal />

          {/* Cartoon avatar, centered, top-[46px] within this wrapper (the
              124px gap off the headline, minus the wrapper's own 78px
              starting offset). Crossfades to the "on hover" variant via
              group-hover — pure CSS, no client component needed. Unlike
              the other decorative images this one must actually receive
              pointer events to detect the hover, so no pointer-events-none
              here. data-hero-avatar: a stable hook HandsReveal's
              scroll-trigger uses to find this exact element via
              document.querySelector — it needs a real avatar DOM node to
              read scroll position against, but can't receive one as a
              ref/prop since GradientHero itself is a Server Component. */}
          <div
            data-hero-avatar
            className="group absolute left-1/2 top-[46px] z-[9] h-[754px] w-[614px] -translate-x-1/2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
            <img
              src="/images/cartoon.webp"
              alt=""
              aria-hidden="true"
              width={614}
              height={754}
              className="absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-300 group-hover:opacity-0"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
            <img
              src="/images/cartoon-hover-v5.webp"
              alt=""
              aria-hidden="true"
              width={760}
              height={754}
              // Wider canvas than the base cartoon (the new art's arms reach
              // further out), framed so the head and belt line up with it;
              // sized by height and centered, overflowing the box sideways.
              className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 select-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            {/* "hover" hint just under the headline, left of the ring and above
                where the card-holding hand appears; stays visible on hover */}
            <AvatarHint label="hover" id="hint-desktop" width="200px" top="-2%" anchor="150px" />
          </div>
        </div>
      </div>
      </section>

      {/* Crossing ribbon banners for the desktop hero — a sibling after
          the section (not a child of it), same reasoning as the mobile
          one below: see DesktopMarqueeRibbons.tsx. */}
      <DesktopMarqueeRibbons />

      {/* ---------------------------------------------------------------- */}
      {/* Tablet variation (425-1024px) — a genuine third composition, not
          a scaled copy of phone or desktop. Per request, it drops the
          edge-bleed cast entirely (grandma/sunflowers/elephant/sticker —
          previously grandma+elephant+sticker here, phone's own sunflower
          substitute) and instead carries over desktop's six-armed hands
          (TabletHandsReveal — same six hands and composition, scaled to
          this breakpoint's fluid avatar box instead of desktop's fixed
          one, but fixed at their final position always — no scroll
          animation here, per request). Every remaining size/position is a
          clamp()'d vw ratio off the 1440 desktop reference instead of
          fixed pixels, since the 425-1024 range is far too wide (2.4x)
          for a single fixed-pixel reference to hold up across, the way
          phone's 320px-anchored numbers mostly do up to ~425px.

          Layout technique is closer to phone than desktop, though: the
          greeting/headline/ring/avatar column is in normal flow (like
          phone's "no fixed height" approach) rather than absolutely
          positioned at fixed top offsets (like desktop) — flow handles
          the headline's variable line-wrapping across a 2.4x width range
          far more robustly than another round of hardcoded pixel guesses
          would. Corner/border share CSS custom properties (--corner-w,
          --corner-h, --border-t) so the border tile's background-size
          always scales in lockstep with the corner — this is the same
          "mismatched scale reads as too-thin a line" bug fixed for phone
          earlier, just solved once via var() instead of two independent
          clamp()s that could drift apart. Avatar uses desktop's pure-CSS
          group-hover crossfade (not phone's tap-to-toggle) since tablet is
          close enough to desktop that a mouse/trackpad is the common case;
          on touch it just falls back to showing the base image, which is
          a harmless default rather than a broken interaction. */}
      <section
        className="relative hidden w-full overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#960D1A_0%,_#4D050C_100%)] tablet:block desktop:hidden"
        style={
          {
            "--corner-w": TABLET_CORNER_W,
            "--corner-h": TABLET_CORNER_H,
            "--border-t": TABLET_BORDER_T,
          } as CSSProperties
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
        <img
          src="/graphics/spiral-header.svg"
          alt=""
          aria-hidden="true"
          width={2579}
          height={2078}
          className="pointer-events-none absolute left-1/2 top-0 z-0 w-[240vw] max-w-none -translate-x-1/2 -translate-y-[18%] animate-spin-slow select-none"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-[url('/images/bg-pattern.webp')] bg-repeat opacity-50 mix-blend-soft-light"
        />

        {/* Corners — sized via the --corner-w/--corner-h vars set on the
            section, so the border strips below (which reference the same
            vars) can never drift out of scale with them. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/top-corner.webp"
          alt=""
          aria-hidden="true"
          width={78}
          height={92}
          className="pointer-events-none absolute left-0 top-0 z-10 select-none"
          style={{ width: "var(--corner-w)", height: "var(--corner-h)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/top-corner.webp"
          alt=""
          aria-hidden="true"
          width={78}
          height={92}
          className="pointer-events-none absolute right-0 top-0 z-10 scale-x-[-1] select-none"
          style={{ width: "var(--corner-w)", height: "var(--corner-h)" }}
        />

        {/* Border strips — background-size is derived from --border-t via
            calc() (native tile is 345x21, a 16.4286:1 ratio) so the ornate
            pattern always scales in lockstep with the strip's own
            thickness, whatever that resolves to. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 bg-[url('/images/border.webp')] bg-left-top bg-repeat-x"
          style={{
            left: "var(--corner-w)",
            right: "var(--corner-w)",
            height: "var(--border-t)",
            backgroundSize: "calc(var(--border-t) * 16.4286) var(--border-t)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 z-10 bg-[url('/images/border-vertical.webp')] bg-left-top bg-repeat-y"
          style={{
            left: "calc(var(--corner-w) * 0.1026)",
            top: "var(--corner-h)",
            width: "var(--border-t)",
            backgroundSize: "var(--border-t) calc(var(--border-t) * 16.4286)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 z-10 bg-[url('/images/border-vertical.webp')] bg-right-top bg-repeat-y"
          style={{
            top: "var(--corner-h)",
            width: "var(--border-t)",
            backgroundSize: "var(--border-t) calc(var(--border-t) * 16.4286)",
          }}
        />

        {/* Lemon-and-chili charm, centered, hanging from the top — same
            self-contained asset as desktop/phone (thread baked in).
            Fixed at 64x180.5 (not a vw-scaled clamp like the rest of this
            section) per exact spec. paddingTop on the greeting/headline
            wrapper below is likewise a fixed 148.5px so the gap between
            this lemon's bottom edge (top: -6px + height: 180.5px = 174.5px
            from the section's top) and the greeting row right under it
            comes out to an exact 24px. Both were raised 50px (half the
            ~100px thread) so the thread shows half as long; the section
            clips the rest at its top edge. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/lemon.webp"
          alt=""
          aria-hidden="true"
          width={72}
          height={189}
          className="pointer-events-none absolute left-1/2 z-[8] -translate-x-1/2 select-none"
          style={{ top: "-56px", width: "64px", height: "180.5px" }}
        />

        {/* Greeting + headline + ring + avatar, in normal flow (see the
            section comment for why) rather than fixed top offsets. */}
        <div
          className="relative flex flex-col items-center"
          style={{ paddingTop: "148.5px" }}
        >
          <TabletHeadlineReveal />

          {/* Ring + avatar + hands, grouped as one unit and center-aligned
              as that unit (rather than each independently centering
              itself and leaving it at that): the ring and avatar are
              exactly centered on this wrapper's own width, but the six
              hands' left/right offsets aren't symmetric (they're posed
              around the character, not mirrored), so their combined span
              (-240px to 900px in desktop's 614-wide hand-frame reference —
              see TabletHandsReveal's HANDS array) has its own midpoint 23px
              right of the frame's center. translateX(-3.746%) (23/614) on
              this shared wrapper nudges the ring+avatar+hands group as a
              whole left by that exact amount, so the GROUP's true visual
              center lands in the middle of the section instead of just the
              avatar/ring's own center — a pure post-layout visual nudge,
              not a layout change (ring/avatar/hands keep centering
              themselves on this wrapper the same way; the wrapper itself
              just renders 3.746%-of-its-width to the left of where flex
              centering alone would put it).
              Wrapper height spans from the ring's own top (0) to the
              avatar's bottom (TABLET_AVATAR_TOP + height), so this block's
              real flow height is what gives the section its bottom edge —
              same "ends right after the avatar" idea as phone, just
              computed from clamp()s instead of one fixed number. */}
          <div
            className="relative z-[7]"
            style={{
              marginTop: "clamp(24px, 4vw, 56px)",
              width: TABLET_AVATAR_W,
              height: `calc(${TABLET_AVATAR_TOP} + ${TABLET_AVATAR_H})`,
              transform: "translateX(-3.746%)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
            <img
              src="/graphics/experience-badge.svg"
              alt=""
              aria-hidden="true"
              width={323}
              height={322}
              className="pointer-events-none absolute left-1/2 top-0 z-[7] -translate-x-1/2 select-none"
              style={{ width: TABLET_RING_W, height: TABLET_RING_H }}
            />

            {/* Six-armed hands — a plain Server Component (TabletHandsReveal,
                unlike desktop's "use client" HandsReveal), scaled to fit
                this fluid avatar box instead of desktop's fixed 614x754
                one. Fixed at their final position always — no scroll
                animation, per request — so no JS/ScrollTrigger is needed
                here at all. z-[8]: above the ring (z-[7]) but below the
                avatar (z-[9]), same stacking as desktop. */}
            <TabletHandsReveal />

            {/* Tapped/clicked to swap images (no hover on touch screens),
                with a "click" hint above the card-holding hand. */}
            <MobileAvatarToggle
              className="left-1/2 -translate-x-1/2"
              style={{ top: TABLET_AVATAR_TOP, width: TABLET_AVATAR_W, height: TABLET_AVATAR_H }}
              hint={<AvatarHint label="click" id="hint-tablet" width="clamp(110px, 15vw, 170px)" top="-7%" anchor="40%" />}
            />
          </div>
        </div>
      </section>

      {/* Crossing ribbon banners for the tablet hero — same reasoning as
          the desktop/phone ones: a sibling after the section, pulled up to
          straddle wherever this section's own (now content-driven) bottom
          edge lands. */}
      <TabletMarqueeRibbons />

      {/* ---------------------------------------------------------------- */}
      {/* Phone variation — reconstructed from Figma node 40:5685 (320px  */}
      {/* reference frame). All positions below are lifted directly from  */}
      {/* that frame's absolute coordinates (frame-relative, origin at the */}
      {/* hero's top-left) rather than scaled down from the desktop copy —  */}
      {/* the mobile design was authored as its own layout, not a shrunk   */}
      {/* version of the 1440 one (e.g. the border strips are proportionally */}
      {/* thinner than the corners, the grandma/elephant illustrations are */}
      {/* replaced with a small circular sunflower-photo cluster, and the   */}
      {/* nav pill is a different shape with a logo + hamburger baked in). */}
      <section className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#960D1A_0%,_#4D050C_100%)] tablet:hidden">
        {/* Same rotating spiral asset as desktop, just re-scaled to this
            frame's proportions (Figma's flattened mobile spiral group is
            1576px wide against the 320px frame, i.e. ~493% of it). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
        <img
          src="/graphics/spiral-header.svg"
          alt=""
          aria-hidden="true"
          width={2579}
          height={2078}
          className="pointer-events-none absolute left-1/2 top-0 z-0 w-[493vw] max-w-none -translate-x-1/2 -translate-y-[8%] animate-spin-slow select-none"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-[url('/images/bg-pattern.webp')] bg-repeat opacity-50 mix-blend-soft-light"
        />

        {/* Corners — same asset as desktop (top-corner.webp), just re-sized
            to this frame's corner box (40x47 vs desktop's native 78x92,
            same ~0.85 aspect ratio). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/top-corner.webp"
          alt=""
          aria-hidden="true"
          width={78}
          height={92}
          className="pointer-events-none absolute left-0 top-0 z-10 h-[47px] w-[40px] select-none"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/top-corner.webp"
          alt=""
          aria-hidden="true"
          width={78}
          height={92}
          className="pointer-events-none absolute right-0 top-0 z-10 h-[47px] w-[40px] scale-x-[-1] select-none"
        />

        {/* Border strips — same tiling technique as desktop, but the tile
            itself is scaled down via background-size (native tile is
            345x21 / 21x345; at this frame's 7px thickness that's a 1/3
            scale, i.e. a 115px repeat instead of 345px) so the ornate
            pattern stays proportional instead of just clipping a sliver
            of the full-size artwork. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[40px] right-[40px] top-0 z-10 h-[11px] bg-[url('/images/border.webp')] bg-left-top bg-repeat-x"
          style={{ backgroundSize: "115px 11px" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[4px] top-[47px] bottom-0 z-10 w-[14px] bg-[url('/images/border-vertical.webp')] bg-left-top bg-repeat-y"
          style={{ backgroundSize: "12px 115px" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[0px] top-[47px] bottom-0 z-10 w-[11px] bg-[url('/images/border-vertical.webp')] bg-right-top bg-repeat-y"
          style={{ backgroundSize: "12px 115px" }}
        />

        {/* "Dekho magar pyar se" sticker — commented out on mobile per
            request; same asset as desktop (sticker - dekho.webp, native
            208x192), re-sized to this frame's 65x60 box (~1.08 aspect
            ratio), if it needs to come back.
        <img
          src="/images/sticker - dekho.webp"
          alt=""
          aria-hidden="true"
          width={208}
          height={192}
          className="pointer-events-none absolute right-[14px] top-[94px] z-[12] h-[60px] w-[65px] select-none"
        />
        */}

        {/* Lemon-and-chili charm — same self-contained asset as desktop
            (lemon.webp, native 72x189, thread already baked into the
            image), hanging centered from the top. Sized to its own native
            aspect ratio at the 60px width (157.5px tall) so it renders
            undistorted, same reasoning as the sunflower swap above. Raised
            44px (half its ~87px thread) so the thread shows half as long;
            the section clips the rest at its top edge. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
        <img
          src="/images/lemon.webp"
          alt=""
          aria-hidden="true"
          width={72}
          height={189}
          className="pointer-events-none absolute left-1/2 top-[-37px] z-[8] h-[157.5px] w-[60px] -translate-x-1/2 select-none"
        />

        {/* "Hi, I'm Ankit" greeting + headline, matching the desktop
            column's structure but with the mobile frame's own text specs
            (Merriweather SemiBold 18px greeting; Arvo Bold 40px headline,
            1.2 line-height, 0/3px/4px black text-shadow).

            Unlike the fixed-width desktop column, this one is anchored to
            the border frame instead of centered at a fixed width: the left
            vertical border sits at 11-18px and the right one at 309-316px
            (320 frame), so pl-[34px]/pr-[27px] holds a constant 16px gap
            off each border's inner edge. Being left/right-anchored (rather
            than a centered fixed-width box) is what makes it scale across
            the whole mobile range instead of leaving growing empty margins
            on wider phones.

            This outer wrapper is in NORMAL FLOW now (pt-[135px]: 179px less
            the 44px the lemon was raised; instead of
            absolute+top-[179px]) rather than absolutely positioned over
            the section — that's what lets the section itself have no
            explicit height and instead auto-size to wherever this content
            actually ends (text, then the ring/avatar below it), so the red
            background stops right after the avatar instead of running to
            a hardcoded height, however many lines the headline wraps to at
            the current viewport width. Everything below the section (plain
            page background) reads as white/off-white with no extra work,
            since it's just the body's own background showing through.
            flex/items-center centers both children (the text column and
            the ring/avatar block after it) without needing left-1/2 +
            -translate-x-1/2 on each. */}
        <div className="relative flex flex-col items-center pt-[135px]">
          <PhoneHeadlineReveal />

          {/* "3+ years of experience" ring (same SVG as desktop) + cartoon
              avatar, both centered, scaled up 20% together as one unit
              (wrapper 505.2x386.4, ring 210x211.2 — both 1.2x their prior
              421x322 / 175x176 sizes; the avatar's own sizing lives in
              MobileAvatarToggle and is scaled the same way there).

              Normal flow now (mt-8 for the 32px gap) instead of
              absolute+top-[calc(100%+32px)], since the parent column above
              is what gives the section its height now — see that comment.
              Horizontal centering comes from the parent's items-center.

              The avatar itself is MobileAvatarToggle — same two images and
              crossfade as desktop's group-hover, but swapped on tap since
              there's no hover on touch devices. */}
          <div className="relative z-[7] mt-8 h-[505.2px] w-[386.4px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
            <img
              src="/graphics/experience-badge.svg"
              alt=""
              aria-hidden="true"
              width={323}
              height={322}
              className="pointer-events-none absolute left-1/2 top-0 z-[7] h-[210px] w-[211.2px] translate-x-[calc(-50%-8px)] select-none"
            />
            <MobileAvatarToggle
              hint={<AvatarHint label="click" id="hint-phone" width="112px" top="-11%" anchor="69%" side="right" />}
            />
          </div>
        </div>
      </section>

      {/* Crossing ribbon banners, straddling right where the mobile hero
          above ends — a sibling after the section (not a child of it), so
          it isn't clipped by the section's own overflow-hidden. See
          MarqueeRibbons.tsx for why. */}
      <MarqueeRibbons />
    </>
  );
}
