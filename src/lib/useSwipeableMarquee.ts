"use client";

import { useEffect, type RefObject } from "react";

const PHONE_MQ = "(max-width: 424px)";
const RESUME_MS = 1500; // auto-scroll resumes this long after the user stops

// Phone only: turns a CSS marquee (a track of two identical halves sliding
// by -50% on a loop, inside an overflow-hidden viewport = the track's parent)
// into a strip the visitor can swipe either way, which keeps scrolling by
// itself at the marquee's own speed whenever nobody is touching it. Touching
// pauses it; it resumes RESUME_MS after the swipe (and its momentum) ends.
// The loop is endless in both directions: the scroll position wraps by one
// half, which looks identical. Idle while off screen. Tablet and desktop
// keep the plain CSS marquee.
export function useSwipeableMarquee(trackRef: RefObject<HTMLElement | null>, loopSeconds: number) {
  useEffect(() => {
    const track = trackRef.current;
    const view = track?.parentElement;
    if (!track || !view) return;
    const mq = window.matchMedia(PHONE_MQ);
    let cleanup: (() => void) | null = null;

    const start = () => {
      track.style.animation = "none";
      view.style.overflowX = "auto";
      view.style.overflowY = "hidden";
      view.classList.add("no-scrollbar");
      let half = track.scrollWidth / 2;
      let pos = view.scrollLeft || 0; // float, so slow speeds don't round to 0
      let raf = 0;
      let last = 0;
      let touching = false;
      let resumeAt = 0;
      let visible = true;
      let ownScroll = false;

      const wrap = () => {
        if (half <= 0) return;
        if (pos >= half) pos -= half;
        else if (pos < 1) pos += half;
      };
      const tick = (t: number) => {
        raf = 0;
        const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
        last = t;
        if (!touching && t >= resumeAt && half > 0) {
          pos += (half / loopSeconds) * dt;
          wrap();
          ownScroll = true;
          view.scrollLeft = pos;
        }
        if (visible) raf = requestAnimationFrame(tick);
      };
      const run = () => {
        if (!raf && visible) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      };

      const pauseForUser = () => {
        resumeAt = performance.now() + RESUME_MS;
      };
      const onTouchStart = () => {
        touching = true;
        pauseForUser();
      };
      const onTouchEnd = () => {
        touching = false;
        pauseForUser();
      };
      const onScroll = () => {
        if (ownScroll) {
          ownScroll = false;
          return;
        }
        // the visitor (or their momentum) moved it: follow, keep it looping,
        // and push the resume back while it's still moving
        pos = view.scrollLeft;
        if (half > 0 && (pos >= half || pos < 1)) {
          wrap();
          ownScroll = true;
          view.scrollLeft = pos;
        }
        pauseForUser();
      };

      view.addEventListener("touchstart", onTouchStart, { passive: true });
      view.addEventListener("touchend", onTouchEnd, { passive: true });
      view.addEventListener("touchcancel", onTouchEnd, { passive: true });
      view.addEventListener("scroll", onScroll, { passive: true });
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) run();
      });
      io.observe(view);
      const ro = new ResizeObserver(() => {
        half = track.scrollWidth / 2;
      });
      ro.observe(track);
      run();

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        view.removeEventListener("touchstart", onTouchStart);
        view.removeEventListener("touchend", onTouchEnd);
        view.removeEventListener("touchcancel", onTouchEnd);
        view.removeEventListener("scroll", onScroll);
        track.style.animation = "";
        view.style.overflowX = "";
        view.style.overflowY = "";
        view.classList.remove("no-scrollbar");
        view.scrollLeft = 0;
      };
    };

    const apply = () => {
      cleanup?.();
      cleanup = null;
      if (mq.matches) start();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      cleanup?.();
    };
  }, [trackRef, loopSeconds]);
}
