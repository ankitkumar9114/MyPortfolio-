"use client";

import { useState } from "react";
import MughalFrame from "@/components/ui/MughalFrame";
import { LOADER_REVEAL, LOADER_REVEAL_NAMES, type LoaderReveal } from "@/lib/loaderReveal";

// The loader over the real site (an iframe of the home page with ?noloader,
// so the site's own loader doesn't play inside it). Pick an ending to play
// it; the site's active one is set in lib/loaderReveal.ts.
export default function LoaderPreview() {
  const [reveal, setReveal] = useState<LoaderReveal>(LOADER_REVEAL);
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const play = (r: LoaderReveal) => {
    setReveal(r);
    setRun((n) => n + 1);
    setPlaying(true);
  };
  return (
    <>
      <iframe src="/?noloader" title="Site" className="fixed inset-0 h-full w-full border-0" />
      {playing && <MughalFrame key={`${reveal}-${run}`} reveal={reveal} progress={100} onDone={() => setPlaying(false)} />}
      <div className="fixed left-1/2 top-3 z-[1100] flex -translate-x-1/2 gap-2 rounded-full bg-black/70 p-1.5 font-[family-name:var(--font-manrope)] text-[13px] text-white shadow-lg backdrop-blur">
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
    </>
  );
}
