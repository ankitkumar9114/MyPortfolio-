"use client";

import { useEffect, useRef } from "react";
import { useTvPower } from "./tvPower";
import { playButtonClick, playPowerClick } from "./tvSounds";

// The power button swaps between two images: power-off.webp (unlit lens,
// raw-images/Power Button off.png) while the TV is off and power.webp (lit
// red light) while it's on. Every other button keeps its single image.
function buttonSrc(key: string, on: boolean) {
  return `/images/tv-buttons/${key === "power" && !on ? "power-off" : key}.webp`;
}

// TV front-panel buttons, left to right per request. Images come from
// raw-images/ (converted to public/images/tv-buttons/*.webp). There was
// no "next" image, so next.webp is the previous button mirrored — a
// stand-in until a real one is provided.
const TV_BUTTONS = [
  { key: "previous", label: "Previous" },
  { key: "play-pause", label: "Play / pause" },
  { key: "next", label: "Next" },
  { key: "volume-up", label: "Volume up" },
  { key: "volume-down", label: "Volume down" },
  { key: "power", label: "Power" },
];

// The recessed panel between the TV's speakers, measured off
// tv-with-table.webp (2000x1128): x 721-1281, y 764-861. Expressed as
// percentages of the image so the row stays locked to the panel at any
// rendered width. Buttons are sized by height (60% of the panel) so the
// rectangular ones and the round power button share one baseline.
const PANEL = { left: "36.05%", top: "67.73%", width: "28%", height: "8.6%" };

export default function TvControls() {
  const remote = useTvPower();
  const { on, autoPress } = remote;
  // When the scroll switches the set on/off, play the same press-down
  // (1px down, darker) the power button shows on a real click, then release.
  // Web Animations API on the image, so it layers over its CSS states.
  const powerImgRef = useRef<HTMLImageElement>(null);
  const onRef = useRef(on);
  useEffect(() => {
    onRef.current = on;
  }, [on]);
  useEffect(() => {
    if (!autoPress) return;
    // The scroll has just switched the set; `on` is its new state.
    playPowerClick(onRef.current);
    powerImgRef.current?.animate(
      [
        { translate: "0 0", filter: "brightness(1)" },
        { translate: "0 1px", filter: "brightness(0.9)", offset: 0.25 },
        { translate: "0 1px", filter: "brightness(0.9)", offset: 0.75 },
        { translate: "0 0", filter: "brightness(1)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  }, [autoPress]);
  const actions: Record<string, () => void> = {
    previous: remote.prev,
    "play-pause": remote.playPause,
    next: remote.next,
    "volume-up": remote.volUp,
    "volume-down": remote.volDown,
    power: remote.toggle,
  };

  return (
    <>
    <CrayonScribble />
    <div
      // Centered row with explicit gaps (margin %s resolve against this
      // panel's width, so they scale with the TV): 2.14% (~6px at the
      // 1000px desktop size) between the five main buttons, and 4.29%
      // (~12px, the original spacing) before the power button.
      className="absolute flex items-center justify-center"
      style={{ left: PANEL.left, top: PANEL.top, width: PANEL.width, height: PANEL.height }}
    >
      {TV_BUTTONS.map(({ key, label }, i) => (
        <button
          key={key}
          type="button"
          aria-label={key === "power" ? (on ? "Turn TV off" : "Turn TV on") : label}
          aria-pressed={key === "power" ? on : undefined}
          onClick={() => {
            if (key === "power") playPowerClick(!on);
            else playButtonClick();
            actions[key]();
          }}
          style={{ marginLeft: i === 0 ? 0 : key === "power" ? "4.29%" : "2.14%" }}
          // Power keeps the full 60%-of-panel height; the rest are 20%
          // smaller (48%) per request.
          className={`group relative flex items-center ${key === "power" ? "h-[60%]" : "h-[48%]"}`}
        >
          {/* Fixed border: a #221f1a silhouette of the button (the color
              is the button art's own dark rim) grown by 1px on every
              side via four zero-blur drop-shadows, so it hugs the
              rounded corners / round power button. It sits on the
              button, not the image, so it stays put while only the
              image below presses down into it. The drop-shadows live on
              this outer span because filter runs before mask on the
              same element and would get masked away. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              filter:
                "drop-shadow(1px 0 0 #221f1a) drop-shadow(-1px 0 0 #221f1a) drop-shadow(0 1px 0 #221f1a) drop-shadow(0 -1px 0 #221f1a)",
            }}
          >
            <span
              className="block h-full w-full"
              style={{
                background: "#221f1a",
                maskImage: `url('${buttonSrc(key, on)}')`,
                WebkitMaskImage: `url('${buttonSrc(key, on)}')`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
              }}
            />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- small decorative raster sized via CSS */}
          <img
            src={buttonSrc(key, on)}
            alt=""
            aria-hidden="true"
            draggable={false}
            ref={key === "power" ? powerImgRef : undefined}
            className="relative h-full w-auto select-none transition-[filter,transform] duration-150 group-hover:brightness-125 group-active:translate-y-px group-active:brightness-90"
            // Power: fixed 142:140 shape (both on/off images share that exact
            // canvas and knob size), so swapping states never changes its
            // width or shifts the rest of the row, even before an image loads.
            style={key === "power" ? { aspectRatio: "142 / 140" } : undefined}
          />
          {key === "power" && (
            // Preloads the other state's image so the first toggle
            // doesn't flash while it downloads.
            // eslint-disable-next-line @next/next/no-img-element -- hidden preload
            <img src={buttonSrc(key, !on)} alt="" aria-hidden="true" className="hidden" />
          )}
        </button>
      ))}
    </div>
    </>
  );
}

// "controller" scrawled on the TV's front in crayon (Caveat), with a
// small hand-drawn arrow pointing down to the buttons. Drawn in the TV image's own
// pixel space (2000x1128) so it stays put at any size. A displacement filter
// roughens the edges and a grain mask leaves waxy gaps, like crayon dragged
// over textured plastic.
function CrayonScribble() {
  return (
    <svg
      viewBox="0 0 2000 1128"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-hidden="true"
    >
      <defs>
        <filter id="tv-crayon" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="9" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.9" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
      </defs>
      <g transform="translate(0 12)" filter="url(#tv-crayon)" fill="#EDE6D6" stroke="#EDE6D6" opacity={0.9} style={{ mixBlendMode: "screen" }}>
        <text
          x={612}
          y={722}
          fontSize={52}
          strokeWidth={1.4}
          transform="rotate(-4 700 710)"
          style={{ fontFamily: "var(--font-caveat), cursive", fontWeight: 700, letterSpacing: "1px" }}
        >
          controller
        </text>
        {/* small arrow: a short curl from the word down toward the buttons,
            kept on the strip above the button panel */}
        <path d="M807 703 C 822 700, 832 707, 832 717 C 832 723, 831 728, 829 732" fill="none" strokeWidth={3.5} strokeLinecap="round" />
        <path d="M822 726 L 829 734 L 837 727" fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
