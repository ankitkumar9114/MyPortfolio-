import type { CSSProperties } from "react";

// Tablet counterpart to MarqueeRibbons.tsx (phone) and
// DesktopMarqueeRibbons.tsx. Structurally this follows the phone version,
// not the desktop one: the tablet GradientHero section is content-driven
// (auto height, ending right after the avatar — see the section's own
// comment) rather than a fixed 1440px box, so the ribbon just needs to
// pull up from wherever this sibling naturally lands right after the
// section, by a constant amount — no SECTION_HEIGHT constant to subtract
// like the desktop version needs.
//
// Sizing (text/star/gap) uses its own vw ratios rather than reusing
// phone's or desktop's — those were tuned to a 320px and a ≥1024px
// reference respectively, and neither ratio reads right across tablet's
// own 425-1024px range. These are tuned against a 768px "typical tablet"
// midpoint instead.
const ITEMS = ["FIGMA", "AFTER EFFECTS", "PREMIERE PRO", "CLAUDE CODE"];
const LAPS = 4;

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

// 18px text / 26px star / 24px gap at a 768px reference (2.344vw, 3.398vw,
// 3.125vw respectively; 25% smaller than the first pass), clamped so 425px
// and 1024px stay legible/sane.
const TEXT_SIZE = "clamp(14px, 2.344vw, 24px)";
const STAR_SIZE = "clamp(20px, 3.398vw, 35px)";
const GAP = "clamp(15px, 3.125vw, 32px)";
const BAR_PADDING_Y = "clamp(8px, 1.125vw, 14px)";

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

// STAGGER: small vertical offset between the two bars (matching the ~24px
// used elsewhere, nudged slightly for the bigger bar). MAX_BAR_HEIGHT is
// just a generous estimate (padding max*2 + star max) for sizing the
// wrapper/buffer below — same reasoning as phone's version, doesn't need
// to be exact. EDGE_BUFFER absorbs the rotation's vertical swing at the
// viewport edges (tan(deg) * distance from the bar's own center), sized
// for tablet's wider range (up to 1024px) than phone's.
const STAGGER = 21;
const YELLOW_DROP = 10; // yellow bar nudged down, closer to the green one
const MAX_BAR_HEIGHT = 63;
const EDGE_BUFFER = 60;
const WRAPPER_HEIGHT = STAGGER + MAX_BAR_HEIGHT + EDGE_BUFFER * 2;
const PULL_UP = (STAGGER + MAX_BAR_HEIGHT) / 2 + EDGE_BUFFER;

export default function TabletMarqueeRibbons() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative z-20 hidden w-full select-none overflow-hidden tablet:block desktop:hidden"
      style={{ height: `${WRAPPER_HEIGHT}px`, marginTop: `-${PULL_UP}px` }}
    >
      <div
        className="absolute left-1/2 w-[200vw] -translate-x-1/2 rotate-[2.6deg] overflow-hidden bg-[#FFCB00]"
        style={{ top: `${EDGE_BUFFER + YELLOW_DROP}px`, paddingBlock: BAR_PADDING_Y }}
      >
        <div className="flex w-max animate-marquee text-black">
          <RibbonContent />
          <RibbonContent />
        </div>
      </div>
      <div
        className="absolute left-1/2 w-[200vw] -translate-x-1/2 -rotate-[2.6deg] overflow-hidden bg-[#04634B] shadow-[0px_3px_6px_rgba(0,0,0,0.15)]"
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
