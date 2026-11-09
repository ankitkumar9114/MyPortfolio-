import HeaderNav from "./HeaderNav";
import PhoneNav from "./PhoneNav";

// Exact outline of the pill in header.svg (M607 4.42383 ... Z) — reused here
// as a CSS clip-path so the frosted-glass backdrop blur is confined to
// precisely the same hexagon shape as the SVG border drawn on top of it.
const PILL_CLIP =
  'path("M607 4.42383C614.059 6.72639 619.927 11.6642 623.443 18.0752L635 32L623.443 45.9238C619.927 52.3351 614.059 57.2724 607 59.5752V63.999H28V59.5752C20.9405 57.2725 15.0717 52.3353 11.5557 45.9238L0 32L11.5557 18.0752C15.0718 11.664 20.9405 6.72631 28 4.42383V0H607V4.42383Z")';

// The nav "pill" shape from Figma (635x64) — fixed to the viewport, 36px
// down from the top, horizontally centered, with the nav (Work / About,
// the logo, Contact / Resume) inside it on desktop.
//
// Responsive: the pill, its glass backdrop, and its clip-path are all defined
// in one fixed 635x64 coordinate space (clip-path: path() can't rescale
// itself to a resized box), so instead of changing width we scale the whole
// thing down as a unit via `transform: scale()` at each breakpoint. That
// keeps the border/glass/clip perfectly aligned at every size. origin-top
// anchors the shrink to the top edge, so the pill's top stays put at the
// fixed 36px offset instead of drifting as it scales.
export default function Header() {
  return (
    <>
      {/* Desktop pill — untouched, just gated behind `desktop:` (1025px+)
          instead of the old `md:` (768px) so it doesn't overlap the new
          tablet pill below. Everything about it (scale-90 doesn't even
          apply anymore since lg:1024 < desktop:1025, so it's always
          scale-100 in the range this actually renders) is pixel-identical
          to before. */}
      <header className="fixed left-1/2 top-0 z-50 mt-9 hidden -translate-x-1/2 desktop:block">
        <div className="relative h-16 w-[635px] origin-top scale-[0.45] sm:scale-75 md:scale-90 lg:scale-100">
          {/* Frosted-glass backdrop: blurs whatever's behind the pill (the
              gradient/spiral/pattern), clipped to the pill's exact silhouette
              so the blur/tint only ever touches the transparent glass area —
              never the crisp gold border, which is a separate layer on top. */}
          <div
            className="absolute inset-0 bg-white/1 backdrop-blur backdrop-saturate-150"
            style={{ clipPath: PILL_CLIP }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
          <img
            src="/graphics/header.svg"
            alt=""
            width={635}
            height={64}
            className="absolute inset-0 h-16 w-[635px] select-none"
          />
          <HeaderNav />
        </div>
      </header>

      {/* Phone and tablet: no top header, a bottom navigation bar instead. */}
      <PhoneNav />
    </>
  );
}
