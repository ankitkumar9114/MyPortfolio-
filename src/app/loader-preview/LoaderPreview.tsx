"use client";

import { useEffect, useRef, useState } from "react";
import MughalFrame from "@/components/ui/MughalFrame";
import { LOADER_REVEAL, LOADER_REVEAL_NAMES, type LoaderReveal } from "@/lib/loaderReveal";

// The endings' GSAP timelines, which they expose in development
// (window.__mandalaTl / __goldenTl): the clock below reads them, and the
// slider and pause button drive them.
type Tl = { time: (t?: number) => number; duration: () => number; pause: (t?: number) => unknown; seek: (t: number, suppressEvents?: boolean) => unknown; play: () => unknown; paused: () => boolean };
type Win = { __mandalaTl?: Tl; __goldenTl?: Tl };
const KEY: Record<LoaderReveal, keyof Win> = { mandala: "__mandalaTl", golden: "__goldenTl" };

// The loader over the real site (an iframe of the home page with ?noloader,
// so the site's own loader doesn't play inside it). Pick an ending to play
// it; the site's active one is set in lib/loaderReveal.ts. The clock shows
// the seconds since the fingertips touched.
export default function LoaderPreview() {
  const [reveal, setReveal] = useState<LoaderReveal>(LOADER_REVEAL);
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState<number | null>(null); // s since the touch; null while they're flying
  const [length, setLength] = useState(0);
  const [paused, setPaused] = useState(false);
  const tlRef = useRef<Tl | null>(null);

  const play = (r: LoaderReveal) => {
    setReveal(r);
    setRun((n) => n + 1);
    setPlaying(true);
    setTime(null);
    setPaused(false);
  };

  // read the running ending's clock every frame
  useEffect(() => {
    // a new run: forget the last one's timelines (the new one is made at the touch)
    const w = window as unknown as Win;
    delete w.__mandalaTl;
    delete w.__goldenTl;
    tlRef.current = null;
    let raf = 0;
    const read = () => {
      const tl = (window as unknown as Win)[KEY[reveal]] ?? null;
      tlRef.current = tl;
      if (tl) {
        setTime(tl.time());
        setLength(tl.duration());
        setPaused(tl.paused());
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [reveal, run]);

  const togglePause = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (tl.paused()) tl.play();
    else tl.pause();
  };

  return (
    <>
      <iframe src="/?noloader" title="Site" className="fixed inset-0 h-full w-full border-0" />
      {playing && <MughalFrame key={`${reveal}-${run}`} reveal={reveal} progress={100} onDone={() => setPlaying(false)} />}
      <div className="fixed left-1/2 top-3 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl bg-black/75 p-2 font-[family-name:var(--font-manrope)] text-[13px] text-white shadow-lg backdrop-blur">
        <div className="flex gap-2">
          {(Object.keys(LOADER_REVEAL_NAMES) as LoaderReveal[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => play(r)}
              className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${reveal === r ? "bg-[#D9A23A] text-black" : "hover:bg-white/15"}`}
            >
              {LOADER_REVEAL_NAMES[r]}
              {r === LOADER_REVEAL ? " (on site)" : ""}
            </button>
          ))}
          <button type="button" onClick={() => play(reveal)} className="rounded-full px-4 py-1.5 font-semibold hover:bg-white/15">
            ↻ Replay
          </button>
        </div>
        {/* the clock: seconds since the fingertips touched */}
        <div className="flex w-full items-center gap-3 px-2 pb-1">
          <button type="button" onClick={togglePause} disabled={time === null} className="w-16 rounded-full bg-white/15 px-2 py-1 font-semibold disabled:opacity-40">
            {paused ? "▶ Play" : "❚❚ Pause"}
          </button>
          <span className="w-[150px] font-mono text-[15px] tabular-nums">
            {time === null ? (playing ? "flying in…" : "done") : `${time.toFixed(2)} s / ${length.toFixed(1)} s`}
          </span>
          <input
            type="range"
            min={0}
            max={length || 1}
            step={0.01}
            value={time ?? 0}
            disabled={time === null}
            onChange={(e) => {
              // pause there, running the update callbacks so every part redraws
              const tl = tlRef.current;
              if (!tl) return;
              tl.pause();
              tl.seek(Number(e.target.value), false);
            }}
            className="flex-1 accent-[#D9A23A]"
            aria-label="Time since the touch"
          />
        </div>
      </div>
    </>
  );
}
