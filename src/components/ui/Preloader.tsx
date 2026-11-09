"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, isReducedMotion } from "@/lib/gsap";
import { markPreloaderComplete } from "@/lib/preloaderSignal";

// Below this, the preloader stays up for at least this long even if every
// image is already cached — long enough for the "Loading" branding to
// actually register, short enough to not feel like an artificial delay.
const MIN_VISIBLE_MS = 900;
// Upper bound on how long the preloader will ever wait on images before
// giving up and finishing anyway — protects against a single stuck
// request (one that somehow never fires load OR error) holding the whole
// page hostage behind the preloader indefinitely.
const MAX_WAIT_MS = 15000;
// Images that mount a moment after the first render (CMS content) are
// picked up by one more scan this long after the start.
const RESCAN_MS = 1200;

// Loads AND decodes an image, so it's ready to paint the instant it scrolls
// into view (decoding a big image mid-scroll is what causes jank).
function prepareImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      img.decode().then(resolve, resolve);
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

// Every image the page uses for THIS screen size: <img> elements that are
// rendered (an element under display:none reports no client rects, so the
// other breakpoints' variants are skipped), plus CSS background images.
// Lazy <img>s are switched to eager, so they load now instead of mid-scroll.
function collectImageUrls(): string[] {
  const urls = new Set<string>();
  for (const img of Array.from(document.images)) {
    if (img.getClientRects().length === 0) continue;
    if (img.loading === "lazy") img.loading = "eager";
    const src = img.currentSrc || img.src;
    if (src) urls.add(src);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body, body *"))) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (!m[1].startsWith("data:")) urls.add(new URL(m[1], location.href).href);
    }
  }
  // the phone wall texture is drawn by body::before
  const before = getComputedStyle(document.body, "::before").backgroundImage;
  for (const m of before.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(new URL(m[1], location.href).href);
  return [...urls];
}

/**
 * Full-screen counter that wipes away once every image the page uses (for
 * this screen size) and the fonts have actually finished loading (not a fixed-duration animation
 * disconnected from real page readiness — a previous version counted 0->100
 * on a flat 1.6s timer regardless of whether the hero's images were
 * actually done, which meant the page could get revealed mid-decode on a
 * slower connection, reading as janky/laggy right as the preloader wiped
 * away). Locks page scroll while active. Skips itself entirely under
 * reduced-motion.
 */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const skip = useRef(isReducedMotion());

  useEffect(() => {
    if (skip.current) {
      setDone(true);
      markPreloaderComplete();
      return;
    }

    document.documentElement.style.overflow = "hidden";
    // Captured once up front for the cleanup function below — by the
    // time cleanup runs, containerRef.current may have already changed
    // (or been nulled out by unmount), so it can't be read fresh there.
    const container = containerRef.current;
    const startedAt = Date.now();
    let finished = false;

    const counter = { value: 0 };
    const writeCount = () => {
      if (countRef.current) countRef.current.textContent = String(Math.round(counter.value));
    };
    const tweenTo = (value: number, duration: number, onComplete?: () => void) => {
      gsap.to(counter, { value, duration, ease: "power1.out", onUpdate: writeCount, onComplete });
    };

    // Everything the whole page shows on this screen size (see
    // collectImageUrls), not just the first screen: loaded and decoded
    // up front, so scrolling and the scroll animations run smoothly with
    // nothing left to fetch. Fonts are waited on too.
    const seen = new Set<string>();
    let total = 1; // the fonts
    let loadedCount = 0;
    const tasks: Promise<void>[] = [];
    const track = (p: Promise<unknown>) => {
      const t = p.then(
        () => undefined,
        () => undefined,
      ).then(() => {
        loadedCount += 1;
        if (!finished) tweenTo(Math.min(99, (loadedCount / total) * 100), 0.25);
      });
      tasks.push(t);
      return t;
    };
    const scan = () => {
      for (const url of collectImageUrls()) {
        if (seen.has(url)) continue;
        seen.add(url);
        total += 1;
        track(prepareImage(url));
      }
    };

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      // Guarantees a minimum, consistent display time regardless of how
      // fast (or slow) the images actually resolved — a network so fast
      // everything's already `.complete` shouldn't make the loading
      // screen flash for a single frame.
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        tweenTo(100, 0.3, () => {
          gsap.to(containerRef.current, {
            yPercent: -100,
            duration: 0.9,
            ease: "power4.inOut",
            // The hero's entrance animations (decor stickers, hands) wait
            // on this signal; it fires as the screen starts uncovering
            // (power4.inOut has barely moved in its first ~30%), so they
            // are already coming in while the loader slides away.
            onUpdate: function () {
              if (this.progress() >= 0.3) markPreloaderComplete();
            },
            onComplete: () => {
              document.documentElement.style.overflow = "";
              setDone(true);
              markPreloaderComplete();
            },
          });
        });
      }, remaining);
    }

    // Live progress as each image actually resolves, so the number means
    // something real instead of being a decorative countdown.
    track(document.fonts.ready);
    scan();
    // a second scan picks up images that mounted after the first render;
    // finish once everything found by then has settled
    const rescan = window.setTimeout(() => {
      scan();
      Promise.all(tasks).then(finish);
    }, RESCAN_MS);

    // Safety net — if some image genuinely never settles, don't hold the
    // page hostage forever; finish() is idempotent (guarded by
    // `finished`) so whichever of this or the Promise.all above resolves
    // first wins and the other becomes a no-op.
    const safety = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.clearTimeout(safety);
      window.clearTimeout(rescan);
      gsap.killTweensOf(counter);
      gsap.killTweensOf(container);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] flex items-end justify-between bg-[var(--background)] p-6 sm:p-10"
    >
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        Loading
      </span>
      <span
        ref={countRef}
        className="font-[family-name:var(--font-display)] text-[12vw] leading-none tabular-nums sm:text-[8vw]"
      >
        0
      </span>
    </div>
  );
}
