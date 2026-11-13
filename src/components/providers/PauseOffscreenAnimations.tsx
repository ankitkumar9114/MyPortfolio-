"use client";

import { useEffect } from "react";

// Pauses the CSS animations of any page section that's off screen (the
// marquee ribbons, the TV star, the grandma's smoke and ember, the fairy
// lights, the footer's phone and screen, …) and resumes them as it comes
// back, so the phone isn't busy animating things nobody can see. Each direct
// child of <main> is watched; while it's more than 200px outside the window
// it's paused by a rule in a <style> tag of our own (main > :nth-child(n)).
// The sections' own attributes are never touched: some hydrate later (behind
// Suspense), and an attribute added before then is a hydration mismatch.
// Renders nothing.
export default function PauseOffscreenAnimations() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || !("IntersectionObserver" in window)) return;
    const style = document.createElement("style");
    style.dataset.pauseOffscreen = "";
    document.head.appendChild(style);
    const off = new Set<Element>();
    const update = () => {
      const kids = Array.from(main.children);
      const sel: string[] = [];
      for (const el of off) {
        const i = kids.indexOf(el);
        if (i >= 0) sel.push(`main > :nth-child(${i + 1})`, `main > :nth-child(${i + 1}) *`);
      }
      style.textContent = sel.length ? `${sel.join(",")}{animation-play-state:paused!important}` : "";
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) off.delete(e.target);
          else off.add(e.target);
        }
        update();
      },
      { rootMargin: "200px 0px" },
    );
    const watch = () => {
      for (const el of off) if (el.parentElement !== main) off.delete(el);
      Array.from(main.children).forEach((el) => io.observe(el));
      update(); // positions may have shifted
    };
    watch();
    // sections that mount later (e.g. a layout swapped for phones)
    const mo = new MutationObserver(watch);
    mo.observe(main, { childList: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      style.remove();
    };
  }, []);
  return null;
}
