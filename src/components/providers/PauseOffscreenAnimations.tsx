"use client";

import { useEffect } from "react";

// Pauses the CSS animations of any page section that's off screen (the
// marquee ribbons, the TV star, the grandma's smoke and ember, the fairy
// lights, the footer's phone and screen, …) and resumes them as it comes
// back, so the phone isn't busy animating things nobody can see. Each direct
// child of <main> is watched; while it's more than 200px outside the window
// it gets data-offscreen, and globals.css sets animation-play-state: paused
// on it and everything inside. Renders nothing.
export default function PauseOffscreenAnimations() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.removeAttribute("data-offscreen");
          else e.target.setAttribute("data-offscreen", "");
        }
      },
      { rootMargin: "200px 0px" },
    );
    const watch = () => Array.from(main.children).forEach((el) => io.observe(el));
    watch();
    // sections that mount later (e.g. a layout swapped for phones)
    const mo = new MutationObserver(watch);
    mo.observe(main, { childList: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      Array.from(main.children).forEach((el) => el.removeAttribute("data-offscreen"));
    };
  }, []);
  return null;
}
