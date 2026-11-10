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

// What counts as "something you can click" for the hover state.
const HOVERABLE = 'a, button, [role="button"], [data-cursor="hover"], label, summary';

// A small white mandala: 12 outer petals, 8 inner petals, a ring of dots and
// a centre, in a 100x100 box centred on 0,0. A thin dark outline (and the
// shadow below) keeps it visible on the page's light areas too.
function Mandala() {
  const petal = (len: number, wid: number) => `M0 0 C ${wid} ${-len * 0.35} ${wid * 0.6} ${-len * 0.85} 0 ${-len} C ${-wid * 0.6} ${-len * 0.85} ${-wid} ${-len * 0.35} 0 0 Z`;
  return (
    <svg viewBox="-50 -50 100 100" className="block h-full w-full" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={`o${i}`} d={petal(46, 13)} transform={`rotate(${i * 30})`} fill="#FFFFFF" fillOpacity="0.92" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path key={`i${i}`} d={petal(30, 11)} transform={`rotate(${i * 45 + 22.5})`} fill="#FFFFFF" stroke="rgba(0,0,0,0.35)" strokeWidth="1.6" />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={`d${i}`} cx="0" cy="-19" r="2.6" transform={`rotate(${i * 30 + 15})`} fill="rgba(0,0,0,0.35)" />
      ))}
      <circle r="12" fill="#FFFFFF" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      <circle r="4.5" fill="rgba(0,0,0,0.35)" />
    </svg>
  );
}

/**
 * Cursor: a small rotating mandala, centred on the pointer. Only on devices
 * with a fine pointer (an actual mouse); touch devices keep their own
 * behaviour and never pay for this. It grows and spins faster over anything
 * clickable (links, buttons, or `data-cursor="hover"`), hides over
 * `data-cursor="hide"` and when the pointer leaves the window, and doesn't
 * spin for visitors who prefer reduced motion. Uses useSyncExternalStore so
 * the pointer check stays hydration-safe (server assumes no fine pointer).
 */
export default function CustomCursor() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const posRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"default" | "hover" | "hide">("default");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const pos = posRef.current;
    if (!pos) return;

    // a touch of smoothing, but quick enough to feel attached to the mouse
    const quick = {
      x: gsap.quickTo(pos, "x", { duration: 0.12, ease: "power3.out" }),
      y: gsap.quickTo(pos, "y", { duration: 0.12, ease: "power3.out" }),
    };
    let first = true;
    const handleMove = (e: MouseEvent) => {
      if (first) {
        // appear right at the pointer instead of gliding in from the corner
        gsap.set(pos, { x: e.clientX, y: e.clientY });
        first = false;
      }
      quick.x(e.clientX);
      quick.y(e.clientY);
      setVisible(true);
    };
    const handleOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-cursor="hide"]')) setVariant("hide");
      else setVariant(el?.closest(HOVERABLE) ? "hover" : "default");
    };
    const handleLeave = () => setVisible(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  const hover = variant === "hover";
  return (
    <div
      ref={posRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[1001]"
      style={{ opacity: visible && variant !== "hide" ? 1 : 0, transition: "opacity 200ms" }}
    >
      {/* centred on the pointer; grows over clickable things */}
      <div
        className="-translate-x-1/2 -translate-y-1/2 transition-[width,height,opacity] duration-200 ease-out"
        // see-through while hovering, so it doesn't hide the link's text
        style={{ width: hover ? 40 : 28, height: hover ? 40 : 28, opacity: hover ? 0.6 : 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
      >
        <div className="cursor-mandala h-full w-full" style={{ animationDuration: hover ? "2.5s" : "8s" }}>
          <Mandala />
        </div>
      </div>
    </div>
  );
}
