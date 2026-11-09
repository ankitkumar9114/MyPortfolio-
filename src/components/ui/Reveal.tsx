"use client";

import { useEffect, useRef } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import clsx from "clsx";

/**
 * Fades + slides its children up into view as they enter the viewport.
 * Reusable across sections instead of re-writing a ScrollTrigger per block.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 40,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        },
      );
    });

    return () => ctx.revert();
  }, [delay, y]);

  const Comp = Tag as React.ElementType;
  return (
    <Comp ref={ref} className={clsx(className)}>
      {children}
    </Comp>
  );
}
