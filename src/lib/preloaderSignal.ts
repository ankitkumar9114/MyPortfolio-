// Tiny cross-component signal for "the full-screen Preloader has finished
// and is no longer covering the page." Plain module-level state + a window
// event, rather than React context — matches this codebase's existing
// pattern of small, independent "use client" leaf components (Preloader,
// HandsReveal, DesktopDecorEntrance, ...) that don't share a React tree
// with each other, all mounted directly from the (Server Component) root
// layout/GradientHero. A module-level singleton is safe here since it's
// genuinely one-per-page-load state, the same way HandsReveal reaches for
// document.querySelector("[data-hero-avatar]") instead of a passed-down ref.
//
// `done` starts false on every fresh module evaluation (i.e. every real
// page load/reload) and flips permanently true the moment the preloader
// finishes — components that mount AFTER that point (unlikely for a
// preloader, but possible with fast refresh in dev) get called back
// immediately instead of waiting forever for an event that already fired.
let done = false;
const EVENT_NAME = "preloader-complete";

/** Called once by the loader (MughalLoader) when it finishes (or skips itself under
 * reduced motion) — safe to call more than once, only the first call does
 * anything. */
export function markPreloaderComplete() {
  if (done) return;
  done = true;
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Runs `callback` once the preloader has finished — immediately if it
 * already has by the time this is called, otherwise as soon as it does.
 * Returns an unsubscribe function for effect cleanup. */
export function onPreloaderComplete(callback: () => void): () => void {
  if (done) {
    callback();
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler, { once: true });
  return () => window.removeEventListener(EVENT_NAME, handler);
}
