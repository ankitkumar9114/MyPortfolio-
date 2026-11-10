"use client";

import { useRef } from "react";
import { useImpactStats } from "@/lib/impactStats";
import { useSwipeableMarquee } from "@/lib/useSwipeableMarquee";
import ImpactStatCard from "./ImpactStatCard";

// The marquee's moving track: two identical laps (the animation slides by
// exactly one lap, so it loops seamlessly). Each lap repeats the cards
// enough times to be wider than any screen, whatever number of cards the
// CMS has (the original 4 cards x 2).
export default function ImpactMarqueeTrack() {
  const stats = useImpactStats();
  const repeats = Math.max(1, Math.ceil(8 / stats.length));
  const loopS = 10 * stats.length * repeats;
  const trackRef = useRef<HTMLDivElement>(null);
  // phone: the row can also be swiped (it keeps going by itself after)
  useSwipeableMarquee(trackRef, loopS);
  const lap = (key: string) => (
    <div key={key} className="flex shrink-0 items-center gap-6 pr-6 tablet:gap-8 tablet:pr-8 desktop:gap-10 desktop:pr-10">
      {Array.from({ length: repeats }).flatMap((_, r) => stats.map((c) => <ImpactStatCard key={`${r}-${c.id}`} {...c} />))}
    </div>
  );
  return (
    <div ref={trackRef} className="flex w-max animate-marquee" style={{ animationDuration: `${loopS}s` }}>
      {lap("a")}
      {lap("b")}
    </div>
  );
}
