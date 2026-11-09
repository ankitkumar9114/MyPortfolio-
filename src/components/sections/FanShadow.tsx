"use client";

import { useEffect, useRef, useState } from "react";

// A classic 3-blade ceiling fan's shadow falling on the chatai scene, blurred
// and multiplied over whatever is beneath (mat and floor). Every part casts:
// the downrod (a line from the hub angled away from the light) ending in the
// round canopy, both static; and the spinning part: the round motor housing,
// the offset metal brackets, and the long, nearly straight blades with
// squared, rounded tips. Sits in the chatai's pinned frame, anchored to its top-right
// corner. It appears (fading in) and starts spinning only once the mat is
// fully unrolled. A dev-only settings panel (left side) shows while the scene is in
// the viewport; share the numbers to make them the defaults.

export type FanSettings = {
  size: number; // vmin, the blades' diameter
  right: number; // % of the frame's width from the right edge to the fan's center
  top: number; // % of the frame's height from the top edge to the fan's center
  opacity: number;
  blur: number; // px
  speed: number; // seconds per turn
  blades: number;
  bladeWidth: number; // relative blade width
  rodAngle: number; // deg, direction the downrod's shadow points (0 = right, 90 = down)
  rodLength: number; // in fan radii
};

export const DEFAULT_FAN: FanSettings = {
  size: 102,
  right: -1.5,
  top: 14.5,
  opacity: 0.13,
  blur: 4.5,
  speed: 3.2,
  blades: 3,
  bladeWidth: 1.75,
  rodAngle: 0,
  rodLength: 0, // no downrod/canopy shadow (light straight above)
};

const SHADOW_COLOR = "#2a0012"; // deep burgundy: reads as shade on the pink

// Parts in a -100..100 viewBox (radius 100 = blade tip), one arm pointing up.
const MOTOR_R = 15; // motor housing
const BLADE_ROOT = 31; // where the blade starts
// Long, nearly straight blade, a touch wider toward the tip, squared tip with
// rounded corners.
function bladePath(width: number) {
  const r = 5.5 * width, t = 7 * width; // half-widths at root / tip
  return `M ${-r} ${-BLADE_ROOT} L ${-t} -94 Q ${-t} -99, ${-t + 4} -99.5 L ${t - 4} -99.5 Q ${t} -99, ${t} -94 L ${r} ${-BLADE_ROOT} Z`;
}
// Metal bracket from the motor rim to the blade root, offset to one side.
function bracketPath(width: number) {
  const o = 2.5 * width;
  return `M ${-o} ${-MOTOR_R + 3} L ${-o - 1.5} -24 L ${-5.5 * width} ${-BLADE_ROOT - 6} L ${o + 2} ${-BLADE_ROOT - 6} L ${o + 3} -24 L ${o + 2} ${-MOTOR_R + 3} Z`;
}

export default function FanShadow() {
  const [fan, setFan] = useState<FanSettings>(DEFAULT_FAN);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || process.env.NODE_ENV !== "development") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const arms = Array.from({ length: fan.blades }, (_, i) => (
    <g key={i} transform={`rotate(${(360 / fan.blades) * i})`}>
      <path d={bracketPath(fan.bladeWidth)} />
      <path d={bladePath(fan.bladeWidth)} />
    </g>
  ));
  const a = (fan.rodAngle * Math.PI) / 180;
  const rodX = Math.cos(a) * fan.rodLength * 100;
  const rodY = Math.sin(a) * fan.rodLength * 100;

  return (
    <>
      {/* full-frame layer, clipped to the frame; the fan's center is placed
          relative to its top-right corner */}
      {/* hidden and still until the chatai lies fully open (its frame's
          data-open), then fades in and starts spinning */}
      <div
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-700 group-data-[open=true]:opacity-100"
        style={{ mixBlendMode: "multiply" }}
      >
        <div
          className="absolute"
          style={{
            width: `${fan.size}vmin`,
            height: `${fan.size}vmin`,
            right: `${fan.right}%`,
            top: `${fan.top}%`,
            // center the fan on (right, top)
            translate: "50% -50%",
            opacity: fan.opacity,
            filter: `blur(${fan.blur}px)`,
          }}
        >
          <svg viewBox="-100 -100 200 200" overflow="visible" className="block h-full w-full" style={{ fill: SHADOW_COLOR }}>
            {/* static: downrod + canopy */}
            <line x1={0} y1={0} x2={rodX} y2={rodY} stroke={SHADOW_COLOR} strokeWidth={4.5} strokeLinecap="round" />
            <circle cx={rodX} cy={rodY} r={7.5} />
            {/* spinning: motor, brackets, blades (rotate about the hub) */}
            <g
              className="animate-spin-slow [animation-play-state:paused]! group-data-[open=true]:[animation-play-state:running]!"
              style={{ animationDuration: `${fan.speed}s`, transformOrigin: "0 0", transformBox: "view-box" }}
            >
              <circle r={MOTOR_R} />
              {arms}
            </g>
          </svg>
        </div>
      </div>
      {process.env.NODE_ENV === "development" && inView && <FanTuner fan={fan} onChange={(patch) => setFan((f) => ({ ...f, ...patch }))} />}
    </>
  );
}

// Dev-only panel on the left side, visible while the chatai scene is on screen.
function FanTuner({ fan, onChange }: { fan: FanSettings; onChange: (patch: Partial<FanSettings>) => void }) {
  const [open, setOpen] = useState(false); // starts collapsed to the "Fan shadow" pill
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 left-20 z-[2000] rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg"
        style={{ cursor: "pointer" }}
      >
        Fan shadow
      </button>
    );
  }
  const rows: [string, keyof FanSettings, number, number, number, (v: number) => string][] = [
    ["Size", "size", 20, 200, 1, (v) => `${v}vmin`],
    ["From right", "right", -40, 60, 0.5, (v) => `${v}%`],
    ["From top", "top", -40, 60, 0.5, (v) => `${v}%`],
    ["Opacity", "opacity", 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`],
    ["Blur", "blur", 0, 30, 0.5, (v) => `${v}px`],
    ["Speed (s / turn)", "speed", 0.3, 12, 0.1, (v) => `${v.toFixed(1)}s`],
    ["Blades", "blades", 2, 6, 1, (v) => `${v}`],
    ["Blade width", "bladeWidth", 0.5, 2, 0.05, (v) => `${v.toFixed(2)}x`],
    ["Rod direction", "rodAngle", 0, 360, 1, (v) => `${v}°`],
    ["Rod length", "rodLength", 0, 0.8, 0.01, (v) => v.toFixed(2)],
  ];
  return (
    <div
      className="pointer-events-auto fixed left-4 top-1/2 z-[2000] w-[240px] -translate-y-1/2 rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur"
      style={{ cursor: "auto" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Fan shadow (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>
      {rows.map(([label, key, min, max, step, fmt]) => (
        <div key={key}>
          <label className="mb-1 mt-2 flex justify-between">
            <span>{label}</span>
            <span className="tabular-nums">{fmt(fan[key])}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={fan[key]}
            onChange={(e) => onChange({ [key]: Number(e.target.value) })}
            className="w-full"
            style={{ cursor: "pointer" }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FAN)}
        className="mt-4 w-full rounded-md bg-white/15 py-1.5 hover:bg-white/25"
        style={{ cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
}
