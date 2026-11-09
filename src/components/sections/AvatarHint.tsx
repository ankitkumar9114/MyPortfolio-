// "hover" / "click" hint beside the hero cartoon: crayon-style Caveat word
// with a hand-drawn arrow pointing at the character (same look as the
// "controller" scribble on the TV). Positioned inside the avatar box: its
// right edge sits at `anchor` (a length from the box's left edge), and it is
// clamped so it never starts closer than 12px to the viewport's left edge
// (the hero boxes are centered on the page, so 50% - 50vw is the viewport
// edge). Pass `className` for show/hide states (e.g. fading out on hover).
export default function AvatarHint({
  label,
  id,
  width,
  top,
  anchor,
  side = "left",
  className = "",
}: {
  label: string;
  id: string; // unique per instance, for the SVG filter
  width: string;
  top: string;
  anchor: string;
  // "left": hint sits left of the character, its right edge at `anchor`,
  // arrow pointing right. "right": hint sits right of it, its left edge at
  // `anchor`, arrow pointing left; clamped to the viewport's right edge.
  side?: "left" | "right";
  className?: string;
}) {
  const left =
    side === "left"
      ? `max(calc(50% - 50vw + 12px), calc(${anchor} - ${width}))`
      : `min(calc(50% + 50vw - 12px - ${width}), ${anchor})`;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 block select-none transition-opacity duration-300 ${className}`}
      style={{ top, width, left }}
    >
      <svg viewBox="0 0 160 70" className="block h-auto w-full overflow-visible">
        <defs>
          <filter id={id} x="-10%" y="-30%" width="120%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="wobble" />
            <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.9" result="mask" />
            <feComposite in="rough" in2="mask" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${id})`} fill="#F3EBDD" stroke="#F3EBDD">
          <text
            x={side === "left" ? 4 : 62}
            y={42}
            fontSize={42}
            strokeWidth={0.8}
            transform={side === "left" ? "rotate(-6 50 34)" : "rotate(5 110 34)"}
            style={{ fontFamily: "var(--font-caveat), cursive", fontWeight: 700 }}
          >
            {label}
          </text>
          {/* arrow curling toward the character */}
          <g transform={side === "left" ? undefined : "translate(160 0) scale(-1 1)"}>
            <path d="M100 30 C 118 22, 136 28, 150 42" fill="none" strokeWidth={3.2} strokeLinecap="round" />
            <path d="M138 42 L 151 44 L 149 31" fill="none" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </span>
  );
}
