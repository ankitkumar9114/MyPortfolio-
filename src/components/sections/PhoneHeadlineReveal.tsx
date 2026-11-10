"use client";

// Phone hero's "Hi, I'm Ankit" greeting (between two lotus icons) and the big
// headline. Shown as plain, static text: per request the hero has no text
// animation; only its images animate in after the loader.
export default function PhoneHeadlineReveal() {
  return (
    <div className="relative z-[9] flex flex-col items-center gap-3 pl-[34px] pr-[27px]">
      <div className="flex items-center gap-4 whitespace-nowrap">
        {/* static upright orientation lives on this wrapper: the intro
            image keeps its own transform free */}
        <span className="inline-flex shrink-0" style={{ transform: "rotate(25deg)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
          <img
            src="/graphics/lotus.webp"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
            className="h-5 w-5 select-none"
          />
        </span>
        <p
          className="font-[family-name:var(--font-serif)] font-semibold text-white"
          style={{ fontSize: "18px", lineHeight: "1.2" }}
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
            width={20}
            height={20}
            className="h-5 w-5 select-none"
          />
        </span>
      </div>

      <h1
        className="w-full text-center font-[family-name:var(--font-arvo)] font-bold text-[#FFCB00]"
        style={{
          fontSize: "40px",
          lineHeight: "1.2",
          textShadow: "0px 3px 4px #000000",
        }}
      >
        Designing &amp; Building Products On Which Startups Bet
      </h1>
    </div>
  );
}
