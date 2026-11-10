import type { CSSProperties } from "react";

// Desktop counterpart to MarqueeRibbons.tsx (mobile) — same crossing
// yellow/green ribbon marquee, scaled up to the Figma desktop spec: 28px
// text, 40px stars, 32px gaps, 64px-tall bars.
//
// Unlike the first pass, the bars are sized in vw (like the mobile
// version) and centered via left-1/2 + -translate-x-1/2 instead of using
// Figma's literal left/width px values — those were measured against
// exactly a 1440-wide frame, so on any wider real browser window (a
// common desktop monitor is 1920px+) they'd fall short of the edges
// instead of "filling both sides". vw-based width scales with however
// wide the window actually is.
//
// Same "render as a sibling right after the section, pull up with a
// negative margin, add buffer so the rotation's wobble near the frame
// edges doesn't clip against the wrapper's own overflow-hidden" technique
// as the mobile version — see MarqueeRibbons.tsx for the full reasoning
// (the desktop section's fixed 1440px height would otherwise clip the
// bars' diagonal a few px early right at the frame edges). BUFFER is
// bigger than mobile's here since the wobble (tan(deg) * distance from
// the bar's own center to the viewport edge) grows with viewport width
// too, and desktop windows run wider than phones.
const ITEMS = ["FIGMA", "AFTER EFFECTS", "PREMIERE PRO", "CLAUDE CODE"];
const LAPS = 3;

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

// Responsive across the whole md:+ range (tablet through wide desktop
// monitors) via clamp(min, preferred-in-vw, max) instead of a flat 28px/
// 40px/32px lifted straight from the Figma spec — those were only ever
// correct at exactly 1440px. The vw-based middle term is each value's own
// ratio to the 1440 reference (e.g. 28/1440 = 1.8vw), so it still matches
// Figma exactly right at 1440 and scales proportionally on either side:
// down toward MIN for narrower tablets (768px), up toward MAX for wide
// monitors, instead of staying a fixed size that reads as oversized on a
// small tablet or undersized on a big screen. Line-height is unitless
// (1.25, matching the original 35/28 ratio) so it scales for free with
// font-size instead of needing its own clamp.
const TEXT_SIZE = "clamp(16px, 1.8vw, 36px)";
const STAR_SIZE = "clamp(22px, 2.6vw, 50px)";
const GAP = "clamp(16px, 2vw, 36px)";

function RibbonContent() {
  return (
    <div className="flex shrink-0 items-center" style={{ gap: GAP, paddingRight: GAP }}>
      {Array.from({ length: LAPS }).map((_, lap) =>
        ITEMS.map((item) => (
          <div key={`${lap}-${item}`} className="flex shrink-0 items-center" style={{ gap: GAP }}>
            <span
              className="whitespace-nowrap font-[family-name:var(--font-serif)] font-bold"
              style={{ fontSize: TEXT_SIZE, lineHeight: 1.25 }}
            >
              {item}
            </span>
            <Sparkle className="shrink-0" style={{ height: STAR_SIZE, width: STAR_SIZE }} />
          </div>
        )),
      )}
    </div>
  );
}

// Bar padding scales the same way as the text/star/gap above (12px at
// 1440 -> 0.83vw), and the bar's own height is no longer a fixed h-16 —
// it's just however tall padding + the (now responsive) star/text content
// comes out to, so it grows and shrinks along with them instead of
// clipping an enlarged star on a wide monitor or leaving dead space around
// a shrunk one on a tablet.
const BAR_PADDING_Y = "clamp(8px, 0.83vw, 20px)";

// The desktop GradientHero section no longer has a fixed 1440px height —
// it's content-driven now (auto-sizing to the headline/ring/avatar column,
// so it can grow when the headline wraps to more lines at narrower
// widths — see that section's own comment). That means this ribbon can't
// assume a SECTION_HEIGHT constant to subtract anymore, the way the first
// pass did; instead it uses the same "sibling naturally lands right at
// the section's end, pull it up by a fixed amount" technique as the
// mobile/tablet versions.
//
// YELLOW_OFFSET/GREEN_OFFSET are relative to the avatar's bottom edge
// (which is exactly where the section ends, since the avatar is the
// last/lowest content in the flow). Nudged down ~20px from the original
// -22/-18.62 (which sat right at the belt) per request, so the crossing
// point reads as lower on the pants instead.
const YELLOW_OFFSET = -2;
const GREEN_OFFSET = 1.38;
// Generous estimate of the bar's own max rendered height (padding max
// 20px*2 + star max 50px), used only to size the wrapper/buffer below —
// doesn't need to be exact, just large enough that the wrapper's own
// overflow-hidden never clips the actual (responsive) bar.
const MAX_BAR_HEIGHT = 90;
const BUFFER = 110;
const WRAPPER_HEIGHT = BUFFER * 2 + (MAX_BAR_HEIGHT + (GREEN_OFFSET - YELLOW_OFFSET));
const PULL_UP = BUFFER - YELLOW_OFFSET;

export default function DesktopMarqueeRibbons() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative z-20 hidden w-full select-none overflow-hidden desktop:block"
      style={{
        height: `${WRAPPER_HEIGHT}px`,
        marginTop: `-${PULL_UP}px`,
      }}
    >
      <div
        className="absolute left-1/2 w-[145vw] -translate-x-1/2 rotate-[3.81deg] overflow-hidden bg-[#FFCB00]"
        style={{ top: `${BUFFER}px`, paddingBlock: BAR_PADDING_Y }}
      >
        <div className="flex w-max animate-marquee text-black">
          <RibbonContent />
          <RibbonContent />
        </div>
      </div>
      <div
        className="absolute left-1/2 w-[152vw] -translate-x-1/2 -rotate-[3.79deg] overflow-hidden bg-[#04634B] shadow-[0px_4px_8px_rgba(0,0,0,0.15)]"
        style={{ top: `${BUFFER + (GREEN_OFFSET - YELLOW_OFFSET)}px`, paddingBlock: BAR_PADDING_Y }}
      >
        <div className="flex w-max animate-marquee text-white">
          <RibbonContent />
          <RibbonContent />
        </div>
      </div>
    </div>
  );
}
