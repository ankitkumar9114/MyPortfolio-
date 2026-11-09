"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

// Mobile equivalent of the desktop cartoon avatar's group-hover crossfade
// (GradientHero.tsx, desktop section). There's no hover on touch devices,
// so this swaps the same two images on tap instead — a real client
// component (useState), unlike the desktop version which stays pure CSS
// via group-hover to keep GradientHero itself a Server Component. Kept as
// its own small component so only this interactive piece needs "use
// client"; the rest of the mobile hero still renders on the server.
//
// Scaled up 20% together with the ring wrapper in GradientHero.tsx: top
// 26px -> 31.2px and height 395px -> 474px (both x1.2). Width/inset-x-0
// need no change — they're already relative to the wrapper, which grew on
// its own end. -translate-x-2: nudged slightly left of center per request.
// className/style position the toggle (defaults: the phone hero's box); the
// tablet hero reuses it with its own box. `hint` renders inside it and can
// fade out once the alternate image is showing (group-data-[on=true]:...).
export default function MobileAvatarToggle({
  className = "inset-x-0 top-[31.2px] h-[474px] w-full -translate-x-2",
  style,
  hint,
}: {
  className?: string;
  style?: CSSProperties;
  hint?: ReactNode;
} = {}) {
  const [showHover, setShowHover] = useState(false);

  return (
    <button
      type="button"
      aria-label="Toggle avatar image"
      onClick={() => setShowHover((prev) => !prev)}
      data-on={showHover}
      className={`group absolute z-[9] cursor-pointer appearance-none border-0 bg-transparent p-0 ${className}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/cartoon.webp"
        alt=""
        aria-hidden="true"
        width={614}
        height={754}
        className={`absolute inset-0 h-full w-full select-none object-contain object-bottom transition-opacity duration-300 ${
          showHover ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- local decorative raster, no optimization to gain at this size */}
      <img
        src="/images/cartoon-hover-v5.webp"
        alt=""
        aria-hidden="true"
        width={760}
        height={754}
        className={`absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 select-none transition-opacity duration-300 ${
          showHover ? "opacity-100" : "opacity-0"
        }`}
      />
      {hint}
    </button>
  );
}
