"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MughalFrame, { flightAt } from "@/components/ui/MughalFrame";
import { GOLDEN_DURATION } from "@/components/ui/goldenReveal";

// The loader over the real site (an iframe of the home page with ?noloader,
// so the site's own loader doesn't play inside it), as one timeline from the
// start to the end of the reveal: play it, pause it, or drag to any moment,
// forwards or backwards.
export default function LoaderPreview() {
  const [run, setRun] = useState(0);
  const [time, setTimeState] = useState(0); // s from the start
  const timeRef = useRef(0);
  const setTime = (t: number) => {
    timeRef.current = t;
    setTimeState(t);
  };
  const [playing, setPlaying] = useState(true);
  // playing from the start runs the real loader (its flight on the compositor,
  // exactly as on the site); pausing or dragging switches to frame-by-frame scrubbing
  const [live, setLive] = useState(true);
  const { touchAt, endAt } = flightAt(0);
  const total = endAt + GOLDEN_DURATION;

  // playing: move the clock on in real time
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = 0;
    const step = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      const next = Math.min(total, timeRef.current + dt);
      timeRef.current = next;
      setTimeState(next);
      if (next >= total) setPlaying(false);
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // the live loader has finished (it hides itself): stop the clock at the end,
  // keeping the finished run on screen (no swap to a fresh frame, no flash)
  const finishLive = useCallback(() => {
    timeRef.current = total;
    setTimeState(total);
    setPlaying(false);
  }, [total]);

  const replay = () => {
    setRun((n) => n + 1);
    setTime(0);
    setLive(true);
    setPlaying(true);
  };

  const after = time - touchAt;
  return (
    <>
      <iframe src="/?noloader" title="Site" className="fixed inset-0 h-full w-full border-0" />
      {live ? (
        <MughalFrame key={`${run}-live`} progress={100} onDone={finishLive} />
      ) : (
        <MughalFrame key={`${run}-scrub`} progress={100} scrubRef={timeRef} />
      )}
      <div className="fixed left-1/2 top-3 z-[1100] flex w-[min(640px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2 rounded-2xl bg-black/75 p-2 font-[family-name:var(--font-manrope)] text-[13px] text-white shadow-lg backdrop-blur">
        <div className="flex justify-center gap-2">
          <button type="button" onClick={replay} className="rounded-full px-4 py-1.5 font-semibold hover:bg-white/15">
            ↻ Replay
          </button>
        </div>
        <div className="flex items-center gap-3 px-2 pb-1">
          <button
            type="button"
            onClick={() => {
              if (time >= total || time === 0) return replay();
              // pausing (or playing on from a paused moment) scrubs frame by frame
              setLive(false);
              setPlaying((p) => !p);
            }}
            className="w-[76px] shrink-0 rounded-full bg-white/15 px-2 py-1 font-semibold"
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          {/* seconds from the start; and before / after the touch */}
          <span className="w-[200px] shrink-0 font-mono text-[14px] tabular-nums">
            {time.toFixed(2)} s · {after < 0 ? `touch in ${(-after).toFixed(2)}` : `touch +${after.toFixed(2)}`}
          </span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={total}
              step={0.01}
              value={time}
              onChange={(e) => {
                setPlaying(false);
                setLive(false);
                setTime(Number(e.target.value));
              }}
              className="w-full accent-[#D9A23A]"
              aria-label="Time from the start"
            />
            {/* where the touch is on the slider */}
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-2 text-[10px] text-[#D9A23A]" style={{ left: `${(touchAt / total) * 100}%`, transform: "translateX(-50%)" }}>
              ▲ touch {touchAt.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
