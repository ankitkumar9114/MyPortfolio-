"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, isReducedMotion } from "@/lib/gsap";
import { setLenis } from "@/lib/lenisInstance";

/**
 * Drives buttery-smooth scrolling via Lenis and keeps it perfectly in sync
 * with GSAP's ticker + ScrollTrigger, which is the standard integration
 * pattern recommended by both libraries.
 *
 * Respects `prefers-reduced-motion` by not intercepting scroll at all.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The actual browser-level "reload doesn't start from the top" fix
    // (history.scrollRestoration = "manual" + scrollTo(0,0)) lives in a
    // beforeInteractive <Script> in app/layout.tsx now, not here — it has
    // to run before hydration to avoid a flash of scrolled-down content,
    // and a useEffect (this one included) only ever runs after the first
    // paint, too late to prevent that flash. See that script's comment.
    if (isReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Lenis computes its own internal scroll position independently of
    // window.scrollY at the moment it's constructed — sync it to the
    // top too (immediate: no animation), or the very first user scroll
    // could jump from Lenis's stale internal position to wherever
    // window.scrollY actually is.
    lenis.scrollTo(0, { immediate: true });

    lenis.on("scroll", ScrollTrigger.update);
    setLenis(lenis);

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Lenis measures the page's scrollable height once, at construction —
    // it does NOT notice the document growing afterward on its own. This
    // page's real total height keeps changing well after that: case-study
    // card images (Card bg.webp, Frame Corners.webp) and the wall texture
    // load asynchronously, and web fonts swapping in can reflow text
    // height too. If Lenis's cached limit goes stale (shorter than the
    // page's real, current height), Lenis physically refuses to scroll
    // past that stale limit — which showed up as a real bug: the last
    // case-study card's own position:sticky release depends on being able
    // to scroll far enough past it, and with a too-short Lenis limit, the
    // user gets capped just short of that, leaving the last card visibly
    // stuck/overlapping the "Impact in Numbers" section below it instead
    // of releasing and scrolling away cleanly.
    //
    // ResizeObserver on <body> is the most robust fix available: it fires
    // on ANY change to the page's total height, for ANY reason (image
    // loads, font swaps, GSAP pins, hydration), not just the specific
    // cases a one-off ScrollTrigger "refresh" listener would happen to
    // cover.
    const resizeObserver = new ResizeObserver(() => lenis.resize());
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
      gsap.ticker.remove(update);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
