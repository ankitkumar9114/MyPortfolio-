import type { CSSProperties } from "react";

// Two crossing diagonal ribbon banners (Figma "Frame 2085664985" / "Frame
// 2085664986"), sitting right where the mobile hero ends — a sibling
// rendered immediately after that <section> in GradientHero.tsx, pulled up
// with a negative margin so it visually straddles the section's bottom
// edge (part on the red gradient, part on the page's own white/off-white
// background below) instead of being clipped by the section's own
// overflow-hidden. That boundary is wherever the mobile hero's own content
// now ends (see the "no fixed height" comment there), so this naturally
// tracks it across viewport widths with no extra positioning math needed.
//
// Each bar is a looping marquee (the same .animate-marquee keyframe
// already set up in globals.css, first written for this exact purpose):
// render one full lap of the item list several times over so it's
// comfortably longer than the bar's own width, then render that whole
// block twice back-to-back and animate translateX 0 -> -50% — the second
// copy slides in exactly as the first slides out, with no visible seam.
//
// Colors/rotation/type straight from the Figma spec: yellow bar #FFCB00 at
// +3.81deg with black text, green bar #04634B at -3.79deg with white text
// and a soft drop shadow — the near-mirrored opposite rotations are what
// make the two bars visually cross.
const ITEMS = ["FIGMA", "AFTER EFFECTS", "PREMIER PRO", "CLAUDE CODE"];
const LAPS = 4;

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

// Responsive across the whole mobile range (320-767px, same as the
// desktop version's md:+ range) via clamp(min, preferred-in-vw, max)
// instead of a flat 18px/30px/24px lifted straight from the Figma spec —
// those were only ever correct at exactly 320px. The vw-based middle term
// is each value's own ratio to the 320 reference (e.g. 18/320 = 5.625vw),
// so it still matches the original design exactly at 320px and scales up
// from there, capped at MAX so it doesn't keep growing indefinitely by the
// time a phone approaches the 768px tablet handoff. Line-height is
// unitless (1.28, matching the original 23/18 ratio) so it scales for
// free with font-size instead of needing its own clamp.
const TEXT_SIZE = "clamp(16px, 5.625vw, 24px)";
const STAR_SIZE = "clamp(24px, 9.375vw, 36px)";
const GAP = "clamp(16px, 7.5vw, 32px)";

function RibbonContent() {
  return (
    <div className="flex shrink-0 items-center" style={{ gap: GAP, paddingRight: GAP }}>
      {Array.from({ length: LAPS }).map((_, lap) =>
        ITEMS.map((item) => (
          <div key={`${lap}-${item}`} className="flex shrink-0 items-center" style={{ gap: GAP }}>
            <span
              className="whitespace-nowrap font-[family-name:var(--font-serif)] font-bold"
              style={{ fontSize: TEXT_SIZE, lineHeight: 1.28 }}
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

// Each bar rotates around its own center (transform-origin defaults to
// 50% 50%), which sits at the viewport's horizontal center since the bar
// itself is centered via left-1/2 + -translate-x-1/2. Moving away from
// that center toward either visible edge, the rotation swings the bar up
// or down — at a ~4deg tilt that's tan(4deg) * distance-from-center, which
// reaches a couple dozen px by the time you're near the edges of a wide
// phone screen. The wrapper needs enough vertical padding to absorb that
// swing, or its own overflow-hidden clips the bar mid-diagonal, showing as
// a hard flat edge instead of the bar reading as continuing off-screen.
// 48px of buffer on each side comfortably covers the worst case up to the
// md breakpoint (768px wide / ~27px of swing).
const EDGE_BUFFER = 48;

// Padding scales the same way as the text/star/gap above (9px at 320 ->
// 2.8125vw), and each bar's own height is no longer a fixed py-[9px] with
// an implied height — it's just however tall padding + the (now
// responsive) star/text content comes out to. MAX_BAR_HEIGHT (padding max
// 14px*2 + star max 36px) is only a generous estimate for sizing the
// wrapper/stagger below — it doesn't need to be exact, just big enough
// that the wrapper's own overflow-hidden never clips the actual bar.
const BAR_PADDING_Y = "clamp(8px, 2.8125vw, 14px)";
const STAGGER = 24;
const MAX_BAR_HEIGHT = 64;

export default function MarqueeRibbons() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative z-20 w-full select-none overflow-hidden tablet:hidden"
      style={{
        height: `${STAGGER + MAX_BAR_HEIGHT + EDGE_BUFFER * 2}px`,
        marginTop: `-${36 + EDGE_BUFFER}px`,
      }}
    >
      <div
        className="absolute left-1/2 w-[220vw] -translate-x-1/2 rotate-[3.81deg] overflow-hidden bg-[#FFCB00]"
        style={{ top: `${EDGE_BUFFER}px`, paddingBlock: BAR_PADDING_Y }}
      >
        <div className="flex w-max animate-marquee text-black">
          <RibbonContent />
          <RibbonContent />
        </div>
      </div>
      <div
        className="absolute left-1/2 w-[220vw] -translate-x-1/2 -rotate-[3.79deg] overflow-hidden bg-[#04634B] shadow-[0px_3px_6px_rgba(0,0,0,0.15)]"
        style={{ top: `${EDGE_BUFFER + STAGGER}px`, paddingBlock: BAR_PADDING_Y }}
      >
        <div className="flex w-max animate-marquee text-white">
          <RibbonContent />
          <RibbonContent />
        </div>
      </div>
    </div>
  );
}
