import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Registering plugins multiple times (e.g. across fast-refresh reloads) is a
// no-op in GSAP, so this is safe to import from any client component.
// SplitText: bundled with the (now fully free, no-charge-license) "gsap"
// npm package itself as of the post-Webflow-acquisition plugin unlock —
// no separate paid/club package needed. Used for per-line/per-word text
// reveal animations (see DesktopHeadlineReveal.tsx) instead of animating
// a whole block of text as one unit.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export const isReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText };
