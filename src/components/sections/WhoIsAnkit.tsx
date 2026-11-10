"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

const PHOTO_GAP = 96; // heading block -> sunflower photo (32px on phone, 40px on tablet)
// photo -> intro paragraph and intro paragraph -> unrolling chatai: 80px on
// desktop (the globals.css `desktop` breakpoint, 1025px+), 120px below it.
const SECTION_GAP = 120;
const SECTION_GAP_DESKTOP = 80;
const DESKTOP_MQ = "(min-width: 1025px)";
function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useSectionGap() {
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_MQ).matches, () => true);
  return desktop ? SECTION_GAP_DESKTOP : SECTION_GAP;
}

// The "Who is this Ankit?" section: heading + "about me" rule, the
// sunflower stamp photo with the scrolling Hindi name band behind it, and the
// scroll-highlight intro paragraph. It sits on the pink panel after the TV
// zoom; TvOnCabinet places it (its top offset comes from the zoom geometry)
// and renders the unrolling chatai right after it.
export default function WhoIsAnkit() {
  const gap = useSectionGap();
  return (
    <div id="about" className="flex scroll-mt-32 flex-col items-center">
    <div className="flex w-full flex-col items-center gap-3 text-center text-white tablet:gap-[20px] desktop:gap-7">
      <h2
        // 48px on tablet; phone/desktop follow the clamp
        className="max-w-[755px] text-[length:clamp(36px,5vw,72px)] uppercase tablet:text-[48px] desktop:text-[length:clamp(36px,5vw,72px)]"
        style={{
          fontFamily: "var(--font-arvo)",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        Who is this Ankit?
      </h2>
      {/* tablet: same line length as every other section divider (10vw) */}
      {/* desktop: shorter 120px lines (centred), not stretched across 637px */}
      <div className="flex w-auto max-w-[637px] items-center gap-4 sm:gap-12 tablet:w-auto tablet:gap-[48px] desktop:w-auto desktop:gap-12">
        <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:bg-[#D3D2D2] tablet:w-[10vw] tablet:flex-none desktop:w-[120px] desktop:flex-none" />
        {/* 20px on tablet; phone/desktop follow the clamp */}
        <span
          className="shrink-0 text-[length:clamp(18px,2vw,28px)] tablet:text-[20px] desktop:text-[length:clamp(18px,2vw,28px)]"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "0.04em",
          }}
        >
          about me
        </span>
        <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:w-[10vw] tablet:flex-none desktop:w-[120px] desktop:flex-none" />
      </div>
    </div>
    {/* isolate: the name band's negative z-index stays behind the photo
        but above the pink panel. */}
    {/* tablet: photo and name band ~28% smaller (606 -> 436px) */}
    <div className="relative isolate mt-[32px] w-full max-w-[606px] tablet:mt-[40px] tablet:max-w-[436px] desktop:mt-[var(--photo-gap)] desktop:max-w-[606px]" style={{ ["--photo-gap" as string]: `${PHOTO_GAP}px` }}>
      <NameBand />
      {/* Stamp-style photo; its soft drop shadow is baked into the image. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative raster with baked shadow */}
      <img
        src="/images/ankit-sunflower.webp"
        alt="Ankit in a yellow kurta, framed by sunflowers on a postage stamp"
        width={606}
        height={605}
        loading="lazy"
        className="block h-auto w-full select-none"
      />
    </div>
    {/* phone 28px / tablet 48px below the photo (instead of the section gap); tablet: a
        bigger 36px paragraph */}
    <ScrollHighlightText
      text={INTRO_TEXT}
      className="mt-[28px] text-[length:clamp(24px,3.9vw,56px)] tablet:mt-[48px] tablet:text-[36px] desktop:mt-[var(--para-gap)] desktop:text-[length:clamp(24px,3.9vw,56px)]"
      style={{ ["--para-gap" as string]: `${gap}px` }}
    />
    </div>
  );
}

const INTRO_TEXT =
  "From early-stage startups to enterprise products, I've spent 3+ years designing digital experiences across B2B and B2C. I've managed the end-to-end design of 5 diverse products at IQOL, built scalable design systems, and improved workflows that reduced lead entry time by 65%. My work spans SaaS platforms, CRM systems, real estate products, and digital experiences for brands like Pidilite, Tata Neu, and SBI Realty. I combine UX research, interaction design, and prototyping with an engineering background to create solutions that balance user needs with business goals. I also enjoy vibe coding, turning design concepts into functional products by building, testing, and refining interfaces myself. I focus on simplifying complex workflows and creating intuitive, production-ready experiences.";

// Scroll-driven read-along: every word starts faint (black at 20%, so it
// reads as a deeper pink) and turns white the moment it crosses a fixed
// reading line just below the center of the window (HIGHLIGHT_LINE). Each
// word's timing comes from its real position in the laid-out paragraph:
// its line lights up as that line crosses the reading line, sweeping left
// to right across it. Scrolling back up un-highlights. Each word is nowrap
// so "end-to-end" never splits.
const HIGHLIGHT_FROM = "rgba(0, 0, 0, 0.2)";
const HIGHLIGHT_TO = "#FFFFFF";
export const HIGHLIGHT_LINE = 0.58; // fraction down the window (the chatai's unroll starts when the paragraph's bottom crosses it)
function ScrollHighlightText({ text, className = "", style }: { text: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Progress p = the point p*height down the paragraph is on the reading line.
  const { scrollYProgress } = useScroll({ target: ref, offset: [`start ${HIGHLIGHT_LINE}`, `end ${HIGHLIGHT_LINE}`] });
  const words = text.split(" ");
  // Per-word [start, end] progress, measured from the layout; until the
  // first measure, an even split by word index.
  const [ranges, setRanges] = useState<[number, number][] | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      const w = el.clientWidth;
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      if (!h || !w || !lh) return;
      const next = wordRefs.current.map((span): [number, number] => {
        if (!span) return [0, 0.001];
        const lineTop = span.offsetTop + span.offsetHeight / 2 - lh / 2;
        const start = (lineTop + (lh * span.offsetLeft) / w) / h;
        const end = start + Math.max((lh * span.offsetWidth) / w, 1) / h;
        return [Math.max(0, start), Math.min(1, Math.max(end, start + 0.001))];
      });
      // The last word finishes exactly as the paragraph's bottom crosses the
      // reading line: the chatai below starts unrolling at that same moment.
      const last = next[next.length - 1];
      if (last) last[1] = 1;
      setRanges(next);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <p
      ref={ref}
      className={`relative w-full max-w-[1113px] ${className}`}
      style={{
        fontFamily: "var(--font-manrope)",
        fontWeight: 600,
        lineHeight: 1.3,
        color: HIGHLIGHT_FROM,
        ...style,
      }}
    >
      {words.map((word, i) => (
        <HighlightWord
          key={i}
          spanRef={(node) => {
            wordRefs.current[i] = node;
          }}
          progress={scrollYProgress}
          range={ranges?.[i] ?? [i / words.length, (i + 1) / words.length]}
        >
          {word}
        </HighlightWord>
      ))}
    </p>
  );
}

function HighlightWord({
  spanRef,
  progress,
  range,
  children,
}: {
  spanRef: (node: HTMLSpanElement | null) => void;
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const color = useTransform(progress, range, [HIGHLIGHT_FROM, HIGHLIGHT_TO]);
  return (
    <>
      <motion.span ref={spanRef} className="whitespace-nowrap" style={{ color }}>
        {children}
      </motion.span>{" "}
    </>
  );
}

// "अंकित कुमार तिवारी" behind the sunflower photo: the name image (solid
// black, shown at 20% opacity so it reads as a darker shade of the pink)
// scrolling sideways full-width, centered slightly above the photo's middle.
// The webp adds 16px of transparent space on the right, where the source's
// last curl touches the edge. Height keeps the lettering at its 1:1 size
// (it was 291px tall before the 328px re-export) up to 40vw-equivalent.
const NAME_BAND_REPEAT = 3; // images per half; covers wide screens
const NAME_BAND_OPACITY = 0.2;
function NameBand() {
  const half = Array.from({ length: NAME_BAND_REPEAT }, (_, i) => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative raster
    <img
      key={i}
      src="/images/ankit-name-hindi.webp"
      alt=""
      width={1457}
      height={328}
      loading="lazy"
      className="block h-[min(328px,45.1vw)] w-auto max-w-none shrink-0 pr-[0.08em] text-[length:min(291px,40vw)] select-none tablet:h-[min(165px,22.75vw)] tablet:text-[length:min(147px,20.2vw)] desktop:h-[min(328px,45.1vw)] desktop:text-[length:min(291px,40vw)]"
    />
  ));
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 w-screen overflow-hidden"
      style={{ top: "47.5%", left: "50%", translate: "-50% -50%", opacity: NAME_BAND_OPACITY }}
    >
      <div className="animate-marquee flex w-max" style={{ animationDuration: "60s" }}>
        {half}
        {half}
      </div>
    </div>
  );
}
