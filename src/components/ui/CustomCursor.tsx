"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "@/lib/gsap";

function subscribe(callback: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
const getSnapshot = () => window.matchMedia("(pointer: fine)").matches;
const getServerSnapshot = () => false;

/**
 * A magnetic dot-and-ring cursor. Only active on devices with a fine
 * pointer (i.e. an actual mouse) — touch devices keep the OS cursor and
 * never pay for this at all. Uses useSyncExternalStore so the pointer-type
 * check stays hydration-safe (server always assumes "no fine pointer").
 *
 * Elements can opt in to the "hovered" (scaled up) state by adding
 * `data-cursor="hover"`, and hide the cursor entirely with `data-cursor="hide"`.
 */
export default function CustomCursor() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"default" | "hover" | "hide">("default");

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const quickDot = {
      x: gsap.quickTo(dot, "x", { duration: 0.1, ease: "power3.out" }),
      y: gsap.quickTo(dot, "y", { duration: 0.1, ease: "power3.out" }),
    };
    const quickRing = {
      x: gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3.out" }),
      y: gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3.out" }),
    };

    const handleMove = (e: MouseEvent) => {
      quickDot.x(e.clientX);
      quickDot.y(e.clientY);
      quickRing.x(e.clientX);
      quickRing.y(e.clientY);
    };

    const handleOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("[data-cursor]");
      const value = target?.getAttribute("data-cursor");
      setVariant(value === "hover" || value === "hide" ? value : "default");
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[999] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] transition-opacity duration-200"
        style={{ opacity: variant === "hide" ? 0 : 1 }}
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[998] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--accent)] transition-all duration-300 ease-out"
        style={{
          width: variant === "hover" ? 64 : 32,
          height: variant === "hover" ? 64 : 32,
          opacity: variant === "hide" ? 0 : variant === "hover" ? 0.6 : 0.35,
        }}
      />
    </>
  );
}
