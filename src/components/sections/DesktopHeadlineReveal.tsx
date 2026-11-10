"use client";

// Desktop hero's "Hi, I'm Ankit" greeting (between two lotus icons) and the big
// headline. Shown as plain, static text: per request the hero has no text
// animation; only its images animate in after the loader.
export default function DesktopHeadlineReveal() {
  return (
    <div className="relative z-[9] flex flex-col items-center gap-4">
      {/* Merriweather (serif) — distinct from the display font used for
          the headline right below it. */}
      <div
        className="flex items-center gap-4 whitespace-nowrap"
      >
        {/* static upright orientation lives on this wrapper: the intro
            image keeps its own transform free */}
        <span className="inline-flex shrink-0" style={{ transform: "rotate(25deg)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
          <img
            src="/graphics/lotus.webp"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            className="h-6 w-6 select-none"
          />
        </span>
        <p className="font-[family-name:var(--font-serif)] text-3xl text-white">
          Hi, I&apos;m Ankit
        </p>
        {/* static upright orientation lives on this wrapper: the intro
            image keeps its own transform free */}
        <span className="inline-flex shrink-0" style={{ transform: "scaleX(-1) rotate(25deg)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
          <img
            src="/graphics/lotus.webp"
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            className="h-6 w-6 select-none"
          />
        </span>
      </div>

      {/* Big headline — Arvo (--font-arvo, distinct from the project's
          usual --font-display), per the Figma spec's exact values.
          Per request: font-size stays fixed (not responsive) — width is
          what responds, via a fixed 228px margin from the left/right
          edges (calc(100vw - 456px), i.e. 228px * 2) instead of a
          vw/clamp ratio, so shrinking the frame keeps that margin fixed
          rather than shrinking the text itself. height is auto (not the
          old hardcoded 3-line guess) since a fixed-width-but-shrinking
          box can wrap to more lines at narrower widths. */}
      <h1
        className="w-[calc(100vw-456px)] text-center font-[family-name:var(--font-arvo)] font-bold text-[#FFCB00]"
        style={{
          fontSize: "72px",
          lineHeight: "117%",
          textShadow: "0px 4px 4px #000000",
        }}
      >
        Designing &amp; Building
        <br />
        Products On Which
        <br />
        Startups Bet
      </h1>
    </div>
  );
}
