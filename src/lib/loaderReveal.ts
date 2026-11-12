// How the site's loader ends, once the two fingertips touch. Both endings
// are kept; change LOADER_REVEAL to switch (and try either at /loader-preview
// in development).
//
//   "mandala" - Mandala activation: the mandala lights up, turns, swells, and
//               a soft golden ring opens the site (CSS/SVG + GSAP, no WebGL)
//   "golden"  - Golden energy: a three.js explosion of golden particles,
//               rings and trails, then a golden wave dissolves the artwork

export type LoaderReveal = "mandala" | "golden";

export const LOADER_REVEAL: LoaderReveal = "mandala";

export const LOADER_REVEAL_NAMES: Record<LoaderReveal, string> = {
  mandala: "Mandala activation",
  golden: "Golden energy",
};
