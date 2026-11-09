// One "Impact in Numbers" stat card: scalloped frosted frame, heading,
// subtitle and project tag. Content comes from the CMS (lib/impactStats.ts).
export default function ImpactStatCard({ heading, subtitle, tag }: { heading: string; subtitle: string; tag: string }) {
  return (
    // Phone and tablet cards are taller than the frame's own proportions
    // (phone 260x160, tablet 300x192) so a heading, a two-line subtitle and
    // the tag all fit inside the frame; desktop keeps the frame's shape.
    <div className="relative aspect-[260/160] w-[260px] shrink-0 tablet:aspect-[300/192] tablet:w-[300px] desktop:aspect-[395/203] desktop:w-[395px]">
      {/* Frosted-glass blur of the wall texture behind the card, per
          request. The SVG's own backdrop-filter does nothing when loaded
          via <img> (it renders in isolation, with no page behind it), so
          the blur is a real CSS backdrop-filter on this layer instead,
          masked to the card's exact scalloped silhouette
          (impact-card-mask.svg is the SVG's outer path filled solid) so
          it doesn't leave squared-off blurred corners outside the shape. */}
      {/* Not on phone: iPhone browsers (WebKit) draw a masked backdrop blur
          over the card's text too, blurring it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden tablet:block"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          maskImage: "url('/graphics/impact-card-mask.svg')",
          WebkitMaskImage: "url('/graphics/impact-card-mask.svg')",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector frame, no optimization to gain */}
      <img
        src="/graphics/impact-card.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full select-none desktop:block"
      />
{/* phone: the frame as a 3x raster (impact-card-phone.webp, rendered
          from impact-card.svg with sharp at the phone card's 260x160). The
          SVG's shadow and grain filters are drawn at its own 411x219 size,
          so stretched onto a phone's high-density screen it came out soft. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative raster frame, sized by the card */}
      <img
        src="/graphics/impact-card-phone.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none tablet:hidden"
      />
            {/* tablet: the same frame, stretched to the taller card
          (impact-card-stretch.svg = impact-card.svg + preserveAspectRatio="none") */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative vector frame, no optimization to gain */}
      <img
        src="/graphics/impact-card-stretch.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full select-none tablet:block desktop:hidden"
      />
      {/* Frame 55 — left/right 18.23%, top 19.7%, bottom 15.27% of the
          card, per spec. Phone/tablet: content centered between 18px/24px
          top/bottom padding, to suit their taller cards. */}
      <div
        className="absolute bottom-[18px] top-[18px] flex flex-col items-center justify-center gap-[12px] text-center tablet:bottom-[24px] tablet:top-[24px] tablet:gap-[18px] desktop:bottom-[15.27%] desktop:top-[19.7%] desktop:justify-start desktop:gap-[24px]"
        style={{ left: "18.23%", right: "18.23%" }}
      >
        <div className="flex w-full flex-col items-center gap-[4px]">
          {/* Figma's own heading text box (295px) is wider than its
              containing Frame54 (251px) — a small overrun Figma's own
              auto-layout evidently allowed, and needed: Frame54's own
              70px height is exactly [24px-font, 150%-line-height,
              one-line heading] + [4px gap] + [one-line subtitle],
              leaving no room for the heading to wrap without pushing the
              subtitle down and breaking that spacing. w-[194/224/295px]
              (the same 295/395 ratio at each breakpoint's own card
              width) gives it that extra room, intentionally overflowing
              past Frame55's own 18.23%-inset edges by a few px on each
              side — Frame55 has no overflow-hidden, so this doesn't
              clip against anything, and the decorative card frame has
              enough of its own padding that it stays clear of the
              scalloped edge. */}
          <h3
            className="w-[194px] whitespace-nowrap font-[family-name:var(--font-serif)] font-black capitalize text-[#191919] text-[16px] tablet:w-[224px] tablet:text-[20px] desktop:w-[295px] desktop:text-[24px]"
            style={{ lineHeight: "150%" }}
          >
            {heading}
          </h3>
          <p
            className="w-full font-[family-name:var(--font-manrope)] font-medium text-[#575757] text-[13px] tablet:text-[16px] desktop:text-[20px]"
            style={{ lineHeight: "150%" }}
          >
            {subtitle}
          </p>
        </div>
        <p
          className="font-[family-name:var(--font-newsreader)] font-extrabold text-[#881337] text-[22px] tablet:text-[27px] desktop:text-[32px]"
          style={{ lineHeight: "120%" }}
        >
          {tag}
        </p>
      </div>
    </div>
  );
}
