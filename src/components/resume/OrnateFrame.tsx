import type { ReactNode } from "react";

// The hero's gold-and-red border (the same top-corner.webp, border.webp and
// border-vertical.webp as GradientHero) around its children, as in the
// Figma resume: the corner mirrored into all four corners and the strips
// tiled along every edge, at the artwork's own size.
const CW = 78;
const CH = 92;
const S = 21;

function Corner({ className, transform }: { className: string; transform?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small decorative raster, no optimization to gain
    <img
      src="/images/top-corner.webp"
      alt=""
      aria-hidden="true"
      width={CW}
      height={CH}
      className={`pointer-events-none absolute z-10 select-none ${className}`}
      style={{ width: CW, height: CH, transform }}
    />
  );
}

export default function OrnateFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <Corner className="left-0 top-0" />
      <Corner className="right-0 top-0" transform="scaleX(-1)" />
      <Corner className="bottom-0 left-0" transform="scaleY(-1)" />
      <Corner className="bottom-0 right-0" transform="scale(-1, -1)" />
      <div aria-hidden="true" className="pointer-events-none absolute top-0 z-10 bg-[url('/images/border.webp')] bg-left-top bg-repeat-x" style={{ left: CW, right: CW, height: S }} />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 z-10 bg-[url('/images/border.webp')] bg-left-top bg-repeat-x" style={{ left: CW, right: CW, height: S, transform: "scaleY(-1)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute z-10 bg-[url('/images/border-vertical.webp')] bg-left-top bg-repeat-y" style={{ left: 8, top: CH, bottom: CH, width: S }} />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 z-10 bg-[url('/images/border-vertical.webp')] bg-left-top bg-repeat-y" style={{ top: CH, bottom: CH, width: S }} />
    </div>
  );
}
