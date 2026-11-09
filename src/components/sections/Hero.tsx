"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, isReducedMotion } from "@/lib/gsap";

const LINES = ["Designing & building", "immersive digital", "experiences."];

const MARQUEE_ITEMS = [
  "UI/UX Design",
  "Web Development",
  "Motion Design",
  "Branding",
];

export default function Hero() {
  const linesRef = useRef<HTMLDivElement>(null);
  const cornerLeftRef = useRef<HTMLImageElement>(null);
  const cornerRightRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = linesRef.current;
    if (!el || isReducedMotion()) return;

    const rows = el.querySelectorAll("[data-line]");
    gsap.fromTo(
      rows,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.1,
        delay: 1.5,
      },
    );

    // Gentle, continuous drift so the corner graphics feel alive rather than static.
    [cornerLeftRef.current, cornerRightRef.current].forEach((corner, i) => {
      if (!corner) return;
      gsap.to(corner, {
        y: i === 0 ? 14 : -14,
        rotation: i === 0 ? 6 : -6,
        duration: 3.5 + i * 0.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }, []);

  return (
    <section
      id="top"
      className="relative flex min-h-svh flex-col justify-between overflow-hidden px-6 pt-32 pb-10 sm:px-10"
    >
      <Image
        ref={cornerLeftRef}
        src="/images/top-corner.webp"
        alt=""
        aria-hidden="true"
        width={78}
        height={92}
        priority
        className="pointer-events-none absolute -left-8 top-20 z-0 h-auto w-24 opacity-90 sm:top-24 sm:w-36 lg:w-44"
      />
      <Image
        ref={cornerRightRef}
        src="/images/top-corner.webp"
        alt=""
        aria-hidden="true"
        width={78}
        height={92}
        priority
        className="pointer-events-none absolute -right-8 top-20 z-0 h-auto w-24 scale-x-[-1] opacity-90 sm:top-24 sm:w-36 lg:w-44"
      />

      <div ref={linesRef} className="relative z-10">
        {LINES.map((line) => (
          <div key={line} className="overflow-hidden">
            <h1
              data-line
              className="font-[family-name:var(--font-display)] text-[12vw] font-medium leading-[0.95] tracking-tight sm:text-[7vw]"
            >
              {line}
            </h1>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Available for freelance — 2026
        </div>

        <div className="relative flex overflow-hidden border-t border-[var(--border)] py-4">
          <div className="animate-marquee flex shrink-0 gap-10 pr-10">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-10 text-sm uppercase tracking-[0.2em] text-[var(--muted)]"
              >
                {item}
                <span aria-hidden className="text-[var(--accent)]">
                  ✦
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
