import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registering plugins multiple times (e.g. across fast-refresh reloads) is a
// no-op in GSAP, so this is safe to import from any client component.
// (SplitText used to be registered here too, but nothing uses it, so it's
// no longer shipped.)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const isReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger };
