// How the site's loader ends, once the two fingertips touch. One ending now:
//
//   "golden" - Golden energy: an energy ball grows between the hands and
//              bursts into a three.js explosion; a golden wave opens the site
//
// (The "Mandala activation" ending was removed.) Try it at /loader-preview in
// development.

export type LoaderReveal = "golden";

export const LOADER_REVEAL: LoaderReveal = "golden";

export const LOADER_REVEAL_NAMES: Record<LoaderReveal, string> = {
  golden: "Golden energy",
};
