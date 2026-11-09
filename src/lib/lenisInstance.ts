import type Lenis from "lenis";

// The app-wide Lenis instance created by SmoothScroll.tsx, so components can
// read its velocity or steer it (e.g. the TV section's soft scroll stops).
// Null before SmoothScroll mounts, under reduced motion, and after unmount.
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}
