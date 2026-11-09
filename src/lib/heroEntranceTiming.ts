// Shared timing for the desktop hero's page-load intro sequence, spread
// across two separate components (DesktopHeadlineReveal, DesktopDecorEntrance)
// that each independently listen for onPreloaderComplete() — a single
// source for the stagger step means both files count off the same
// sequence instead of hardcoding disconnected delay numbers that could
// drift out of sync with each other.
//
// Per request, EVERYTHING in the intro comes in one by one (not clustered
// in twos/threes) — greeting, then headline, then each decor image in
// turn — both to read as a clean sequential reveal and because having
// every element's gsap.set()/gsap.to() fire in the exact same tick (when
// the preloader's onComplete callback runs) was adding to visible jank
// right at that moment, on top of Lenis/ScrollTrigger/image-decode work
// all initializing around the same time. Spacing them out means each
// step's (small) setup cost lands in a different frame instead of piling
// into one.
export const HERO_ENTRANCE_STEP = 0.3;

/** index 0 = grandma, 1 = sunflowers, 2 = elephant, 3 = sticker, 4 = the
 * hands' scroll setup — see DesktopDecorEntrance.tsx and HandsReveal.tsx.
 * (The greeting/headline used to take indexes 0-1; the hero text no longer
 * animates, so the stickers now start right away.) */
export function heroEntranceDelay(index: number): number {
  return index * HERO_ENTRANCE_STEP;
}
