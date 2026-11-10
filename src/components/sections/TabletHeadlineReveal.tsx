"use client";

// Tablet hero's "Hi, I'm Ankit" greeting (between two lotus icons) and the big
// headline. Shown as plain, static text: per request the hero has no text
// animation; only its images animate in after the loader.
export default function TabletHeadlineReveal() {
  return (
    <div className="relative z-[9] flex flex-col items-center" style={{ gap: "clamp(8px, 1.5vw, 16px)" }}>
      <div
        className="flex items-center whitespace-nowrap"
        style={{ gap: "clamp(10px, 1.5vw, 16px)" }}
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
            className="select-none"
            style={{ height: "clamp(16px, 1.667vw, 24px)", width: "clamp(16px, 1.667vw, 24px)" }}
          />
        </span>
        <p
          className="font-[family-name:var(--font-serif)] text-white"
          style={{ fontSize: "24px" }}
        >
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
            className="select-none"
            style={{ height: "clamp(16px, 1.667vw, 24px)", width: "clamp(16px, 1.667vw, 24px)" }}
          />
        </span>
      </div>

      <h1
        className="w-[min(85vw,700px)] text-center font-[family-name:var(--font-arvo)] font-bold text-[#FFCB00]"
        style={{
          fontSize: "52px",
          lineHeight: "117%",
          textShadow: "0px 3px 4px #000000",
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
