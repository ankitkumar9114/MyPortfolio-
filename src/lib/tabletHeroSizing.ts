// Tablet (425-1024px) hero avatar sizing — shared between GradientHero.tsx
// (which sizes the ring/avatar themselves) and TabletHandsReveal.tsx
// (which needs the EXACT same avatar box to scale the six hands against,
// so they never drift out of alignment with the avatar itself). A single
// source of truth here means a future tweak to the avatar's tablet size
// automatically keeps the hands correctly scaled/positioned against it,
// rather than risking two independently-hand-copied clamp() strings
// silently going out of sync.
//
// Each a clamp(min, preferred-vw, max) where the vw term is that
// element's own ratio to the desktop 1440 reference (e.g. the avatar is
// 614px wide at 1440, so 614/1440 = 42.64vw) — see GradientHero.tsx's own
// top-of-file comment for the fuller rationale behind this pattern.
//
// W/H are scaled up 1.25x from that straight desktop ratio (per request,
// tablet's avatar reads bigger than a plain 1440-scaled-down copy would
// give) — every bound (min/vw/max) multiplied by the same 1.25 factor, so
// the W:H aspect ratio this clamp pair traces out is untouched, which is
// what TabletHandsReveal.tsx's own scaled() math relies on. TOP is left
// at its original (non-scaled) value — only the avatar's own size grows,
// not its offset within the ring.
export const TABLET_AVATAR_W = "clamp(350px, 53.3vw, 687.5px)";
export const TABLET_AVATAR_H = "clamp(430px, 65.45vw, 845px)";
export const TABLET_AVATAR_TOP = "clamp(20px, 3.19vw, 46px)";
