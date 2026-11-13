"use client";

import { useEffect, useState } from "react";
import { isReducedMotion } from "@/lib/gsap";
import { markPreloaderComplete } from "@/lib/preloaderSignal";
import { getLenis } from "@/lib/lenisInstance";
import MughalFrame from "./MughalFrame";
import { collectImageUrls, prepareImage } from "./loaderAssets";
import { loadThree } from "./goldenReveal";

// The site's full-screen loader: the Mughal frame (MughalFrame), its
// percentage driven by real loading - every image the first screens use on
// this screen size, plus the fonts (see loaderAssets). At 100% the figures'
// fingertips touch, golden energy bursts out and a golden wave opens from the
// centre to show the site. Locks page scroll while up; skipped entirely
// under reduced motion.

// even with everything cached, the loader stays up at least this long
const MIN_VISIBLE_MS = 1000;
// never hold the page longer than this on a stuck request
const MAX_WAIT_MS = 8000;
// images that mount a moment after the first render are picked up by one
// more scan this long after the start
const RESCAN_MS = 400;

// Scrolling is blocked while the loader is up - not just overflow:hidden
// (the smooth scroll, Lenis, moves the page in code and ignores that), but
// the wheel, touch and scroll keys themselves, caught before Lenis sees them.
// It's released once 90% of the screen has been revealed.
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);
let unlockScroll: (() => void) | null = null;
function lockScroll() {
  const block = (e: Event) => {
    if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const opts = { capture: true, passive: false } as const;
  for (const t of ["wheel", "touchmove", "keydown"]) window.addEventListener(t, block, opts);
  document.documentElement.style.overflow = "hidden";
  getLenis()?.stop();
  unlockScroll = () => {
    for (const t of ["wheel", "touchmove", "keydown"]) window.removeEventListener(t, block, opts);
    document.documentElement.style.overflow = "";
    window.scrollTo(0, 0); // start from the top, whatever happened underneath
    const lenis = getLenis();
    lenis?.scrollTo(0, { immediate: true });
    lenis?.start();
    unlockScroll = null;
  };
}
const releaseScroll = () => unlockScroll?.();

// The loader's own pictures, asked for in the page's <head> (so the browser
// fetches them first, before the site's images and before any script runs):
// the phone set on phones, the full set elsewhere.
const PHONE = "(max-width: 480px)";
const BIGGER = "(min-width: 481px)";
const LOADER_IMAGES: [string, string | undefined][] = [
  ["/images/loader-bg-teal.webp", undefined],
  ["/graphics/loader-frame/mandala.svg", undefined],
  ...["flying-ankit-sm", "flying-claude-sm", "loader-cloud-left-sm", "corner-plant-sm", "loader-cloud-top-m", "loader-cloud-flat-m", "loader-flower-plant-m"].map((n): [string, string] => [`/images/${n}.webp`, PHONE]),
  ...["flying-ankit", "flying-claude", "loader-cloud-left", "loader-cloud-right", "loader-cloud-bottom", "loader-cloud-top", "loader-flower-plant", "corner-plant"].map((n): [string, string] => [`/images/${n}.webp`, BIGGER]),
];

// <link rel="preload"> tags in the loader's own HTML (the first thing in the
// page's body), so the browser starts these downloads as soon as it reads them
const preloads = LOADER_IMAGES.map(([href, media]) => <link key={href} rel="preload" as="image" href={href} media={media} fetchPriority="high" />);

export default function MughalLoader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Skipped under reduced motion - and, in development only, with ?noloader
    // (the site shown behind /loader-preview, which plays the loader itself)
    const noLoader = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("noloader");
    if (isReducedMotion() || noLoader) {
      // a frame later, so it isn't a state change straight inside the effect
      const id = requestAnimationFrame(() => {
        setDone(true);
        markPreloaderComplete();
      });
      return () => cancelAnimationFrame(id);
    }
    lockScroll();
    // the explosion's three.js: start downloading now
    loadThree().catch(() => {});
    const startedAt = Date.now();
    let total = 0, settled = 0, ready = false, finished = false, cancelled = false;
    // real progress, held under 100 until everything has settled
    const update = () => {
      if (!cancelled) setProgress(ready ? 100 : total ? Math.min(95, (settled / total) * 100) : 0);
    };
    const tasks: Promise<void>[] = [];
    const track = (p: Promise<unknown>) => {
      total += 1;
      const t = p.then(
        () => undefined,
        () => undefined,
      ).then(() => {
        settled += 1;
        update();
      });
      tasks.push(t);
    };
    const seen = new Set<string>();
    const scan = () => {
      for (const url of collectImageUrls()) {
        if (seen.has(url)) continue;
        seen.add(url);
        track(prepareImage(url));
      }
      update();
    };
    let minTimer = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      minTimer = window.setTimeout(() => {
        ready = true;
        update();
      }, Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt)));
    };

    track(document.fonts.ready);
    // the first scan waits a frame: screen-size-dependent components swap
    // their server (desktop) version right after hydration
    let firstScan = 0;
    const firstFrame = requestAnimationFrame(() => {
      firstScan = window.setTimeout(scan, 0);
    });
    const rescan = window.setTimeout(() => {
      scan();
      Promise.all(tasks).then(finish);
    }, RESCAN_MS);
    const safety = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      window.clearTimeout(firstScan);
      window.clearTimeout(rescan);
      window.clearTimeout(safety);
      window.clearTimeout(minTimer);
      releaseScroll();
    };
  }, []);

  if (done) return null;
  return (
    <>
    {preloads}
    <MughalFrame
      progress={progress}
      // the hero's entrance animations start as the golden wave opens
      onReveal={markPreloaderComplete}
      onRevealed90={releaseScroll}
      onDone={() => {
        releaseScroll();
        markPreloaderComplete();
        setDone(true);
      }}
    />
    </>
  );
}
