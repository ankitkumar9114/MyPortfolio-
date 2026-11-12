"use client";

import { useEffect, useState } from "react";
import { isReducedMotion } from "@/lib/gsap";
import { markPreloaderComplete } from "@/lib/preloaderSignal";
import MughalFrame from "./MughalFrame";
import { collectImageUrls, prepareImage } from "./loaderAssets";

// The site's full-screen loader: the Mughal frame (MughalFrame), its
// percentage driven by real loading - every image the first screens use on
// this screen size, plus the fonts (see loaderAssets). At 100% the figures'
// fingertips touch, energy fire fills the page and burns away from the
// centre to show the site. Locks page scroll while up; skipped entirely
// under reduced motion.

// even with everything cached, the loader stays up at least this long
const MIN_VISIBLE_MS = 1000;
// never hold the page longer than this on a stuck request
const MAX_WAIT_MS = 8000;
// images that mount a moment after the first render are picked up by one
// more scan this long after the start
const RESCAN_MS = 400;

export default function MughalLoader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isReducedMotion()) {
      // a frame later, so it isn't a state change straight inside the effect
      const id = requestAnimationFrame(() => {
        setDone(true);
        markPreloaderComplete();
      });
      return () => cancelAnimationFrame(id);
    }
    document.documentElement.style.overflow = "hidden";
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
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (done) return null;
  return (
    <MughalFrame
      progress={progress}
      // the hero's entrance animations start as the loader burns away
      onReveal={markPreloaderComplete}
      onDone={() => {
        document.documentElement.style.overflow = "";
        markPreloaderComplete();
        setDone(true);
      }}
    />
  );
}
