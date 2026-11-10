"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { getLenis } from "@/lib/lenisInstance";
// Chatai section commented out (replaced by the wire shelf):
// import ChataiUnroll, { type ChataiPrint } from "./ChataiUnroll";
// import FanShadow from "./FanShadow";
// import FridgeStickers from "./FridgeStickers";
import WireShelf from "./WireShelf";
import WhoIsAnkit from "./WhoIsAnkit"; // HIGHLIGHT_LINE and useSectionGap were used by the chatai
import { TvPowerContext } from "./tvPower";
import { TvPicture, useTvState } from "./TvScreen";

// Retro TV + lace cloth sitting on a carved wooden TV cabinet. The TV stays
// a fixed size (~960px at the desktop cap); the cabinet is sized relative
// to it so its width can be tuned without disturbing the TV.
//
// Two values drive the whole layout:
// - SCALE: cabinet width relative to the original reference mockup, where
//   the TV-with-lace image was 80% of the cabinet's width. 1.32 = cabinet
//   32% bigger than that (set via the dev tuner below).
// - SURFACE: how far below the TV's top edge the cabinet's visible top
//   surface sits, as a fraction of the TV's width. Keeping this fixed
//   while SCALE changes means the cabinet grows around its own top
//   surface, so it stays put under the lace instead of dropping as the
//   image gets bigger. Set via the dev tuner (0.406, then recalibrated to
//   0.42 when the padding bug below was fixed, so it looks the same on a
//   ~1728px-wide window, the screen it was tuned on).
//
// Everything is converted to % of the wrapper (= the cabinet image's own
// width, tv-table.webp at 3261x1836) so it all scales together at any
// screen width. The top spacer's padding-top reserves room above the
// cabinet image for the TV's overhang plus the rotating star's tips. It's
// on a child spacer, not the wrapper itself, on purpose: padding % resolves
// against the containing block's width, which for the wrapper is the full
// page row (not its own capped width), so the cabinet used to sit at a
// different height on every screen width. On a child it resolves against
// the wrapper, as intended.
const DEFAULT_SCALE = 1.32;
const DEFAULT_SURFACE = 0.42;
// Star size as a multiple of its native 710px at the 960px desktop TV
// (1.125 = 25% bigger, then 10% smaller per request; tune with the dev
// tuner below).
const DEFAULT_STAR = 1.125;
// Audience (raw-images/group peopel image.png -> tv-audience.webp, 1094x599,
// transparent, people cropped at the bottom edge): size is a multiple of its
// native 1094px at the 960px desktop TV; position is a vertical shift as %
// of its own height (negative = up). Both tunable with the dev tuner.
const DEFAULT_PEOPLE = 1;
const DEFAULT_PEOPLE_Y = -53; // set via the dev tuner

const TV_SHARE = 0.8; // TV width / cabinet width in the original mockup
const TV_PX_AT_CAP = 960; // TV's width at the desktop cap
const CABINET_ASPECT = 1836 / 3261;
const SURFACE_IN_IMAGE = 0.217; // cabinet's visible top surface, fraction of its image height
const TV_ASPECT = 1128 / 2000; // tv-with-table.webp
const TV_CENTER_Y = 0.4074; // TV body's center, fraction of tv-with-table.webp height
// Star width as a fraction of the TV image's width, per unit of the star
// multiplier: its native 710px at the 960px desktop TV, x0.9 (hand-tuned).
const STAR_WIDTH_PER_UNIT = (710 / TV_PX_AT_CAP) * 0.9;
const STAR_ASPECT = 728 / 710; // tv-star.svg
const PEOPLE_WIDTH_PER_UNIT = 1094 / TV_PX_AT_CAP; // fraction of TV width

// Scroll-driven zoom into the TV, per request: once the scene is framed
// with the TV screen's center at SCREEN_VIEWPORT_Y of the window height,
// the page stops scrolling (sticky pin) and the next ZOOM_SCROLL_VH of
// scrolling zooms the camera in until the TV fills the window. The end
// frame matches the user's reference screenshot: from just above the
// screen (TV's top edge cropped off) down to just below the control
// buttons — END_TOP to END_BOTTOM of tv-with-table.webp's height — fit
// exactly to the window's height and centered on the TV. That leaves the
// TV body ~90% of a laptop window's width. On a tall tablet/phone the
// width is the limit instead: the TV body (END_WIDTH of the image's width)
// fits the window's width with END_WIDTH_MARGIN to spare. After that the
// page carries on.
// Screen center (49.75%, 34.09%) and TV body (x 385-1610 of 2000, centered
// at 49.88%) were measured off tv-with-table.webp.
const SCREEN_CY = 0.3409;
const TV_BODY_CX = 0.4988;
const END_TOP = 0.06;
const END_BOTTOM = 0.754;
const END_WIDTH = 0.6125;
const END_WIDTH_MARGIN = 0.98;
const SCREEN_VIEWPORT_Y = 0.45;
const TABLET_MIN_W = 425; // the `tablet:` breakpoint
const DESKTOP_MIN_W = 1025; // the `desktop:` breakpoint
const ZOOM_SCROLL_VH = 1.5;
// Over the last stretch of the zoom (from DARKEN_START of zoom progress,
// the frame the user picked, to the end) everything behind the TV fades to
// a dark grey: a DARK_BG backdrop over the wall and star, and the cabinet
// dimmed to match. The TV itself stays fully lit.
const DARKEN_START = 0.8;
// The TV starts off; when the zoom reaches POWER_ON_AT (the frame the user
// picked, ~60% in) it switches on (CRT effect, power button press).
// Scrolling back above it switches the set off. The buttons work at all
// times. Tablet switches on earlier (~35% in, also picked by the user).
const POWER_ON_AT = 0.6;
const POWER_ON_AT_TABLET = 0.35;

// Soft scroll stops at the two key frames: where the zoom begins (the
// pinned TV scene) and where it ends (max zoom). Only a FAST wheel/trackpad
// scroll gets caught: instead of flying past, it glides into the stop with a
// smooth ease-out and holds there until that gesture's momentum dies down;
// the next scroll carries on. Slow scrolling passes straight through. Works
// in both directions.
// The hold ends when the gesture that hit the stop is over: wheel input goes
// quiet, a NEW gesture starts (deltas jump back up after the momentum tail
// had decayed), or the direction reverses. A long flick never "leaks" past.
// Speeds are measured in px per SECOND (not per frame), so the feel is the
// same on 60Hz and 120Hz screens and while heavy zoom frames render slowly.
// The glide into a stop is an ease-out-quart whose starting speed equals the
// current scroll speed, so there's no lurch: the page just decelerates into
// the frame, the same way in both directions. All of these are live-tunable
// in the dev tuner ("Scroll breaks").
const DEFAULT_STOPS = {
  pin: false, // break where the zoom starts (off by default)
  end: true, // break at max zoom
  minSpeed: 1700, // px/s counts as "fast"
  glideMin: 0.3, // s, shortest glide into a stop
  glideMax: 1, // s, longest glide into a stop
  holdMin: 220, // ms, shortest hold at a stop
  quiet: 140, // ms of wheel quiet = gesture over
  newGesture: 1.5, // delta this many times the decayed tail = new swipe
};
type StopSettings = typeof DEFAULT_STOPS;
const DARK_BG = "#1c1c1c";
// After the zoom the page scrolls on normally, revealing a gradient panel
// tucked under the TV's lace cloth (the cabinet and people have faded out
// by then, so only the TV and cloth remain). The panel lives inside the TV
// group, so it lines up with the cloth at any zoom. Its top sits at 84% down
// tv-with-table.webp, just above where the cloth's open lace holes begin
// (85%), so pink shows through every hole and between the scallops
// (points reach 98%), per request ("move the bg up"); spanning the cloth's width
// (4.5%-95.5% of the image). AFTER_ZOOM_VH of extra scroll follows the zoom.
const UNDER_CLOTH_BG = "linear-gradient(180deg, #FB286D 0%, #900633 100%)";
// Woven-fabric texture over the pink (raw-images/who is ankit overlay
// image .png -> who-is-ankit-fabric-mirror.webp, see below), per request: multiply
// blend at 60% opacity, tiled to cover the whole panel. Tile size is set so
// it shows at its native 1438px on screen at the final zoom (the panel is
// inside the scaled scene, so it's divided by the zoom).
// Mirrored 2x2 tile (original | flipped horizontally / flipped vertically |
// both), so every repeat meets a mirror of its own edge: no visible seams
// where the texture repeats. FABRIC_TILE_PX is the whole 2x2 tile's width
// (each quadrant still shows at the original 1438px).
const FABRIC_SRC = "/images/who-is-ankit-fabric-mirror.webp";
const FABRIC_TILE_PX = 1438 * 2;
const FABRIC_OPACITY = 0.6;
const UNDER_CLOTH_TOP = 0.84; // fraction of the TV image's height
const UNDER_CLOTH_X = [0.045, 0.955]; // fraction of the TV image's width
// Soft shadow the lace casts onto the pink panel: a blacked-out, blurred copy
// of the TV image, clipped to the cloth's lower edge and nudged down, behind
// the real image. Like the panel, it sits behind the cabinet until that fades.
const CLOTH_SHADOW_CLIP_TOP = 0.8; // fraction of the TV image's height
const CLOTH_SHADOW_OFFSET = 0.2; // % of the TV image's height, downward
const CLOTH_SHADOW_BLUR = 2; // px, scales with the scene's zoom
const CLOTH_SHADOW_OPACITY = 0.4;
const AFTER_ZOOM_VH = 1;
// "Who is this Ankit?" heading on the pink panel, HEADING_GAP px below the
// lace's lowest points (CLOTH_BOTTOM of the TV image, measured off its
// alpha) as they sit at max zoom. It lives in the after-zoom spacer, so it
// scrolls up with the panel.
const CLOTH_BOTTOM = 0.982;
const HEADING_GAP = 120;
// No pink below the chatai: the section ends the moment its unroll finishes
// (the chatai's pinned scroll track is the last thing in it).
const AFTER_CONTENT_BOTTOM = 0;
const PEOPLE_PARALLAX = 0.35;
const PEOPLE_ZOOM_DROP = 0.6;
// Camera focus pull: as the zoom starts, the audience gradually blurs (up to
// the max blur in px on screen) so it reads as the lens focusing on the TV.
// Two patterns, switchable in the dev tuner:
// - "slow-then-fast" (ease-in, p^CURVE): subtle at first, then builds
//   faster and faster toward the end of the zoom. The default, per request.
// - "fast-then-slow" (ease-out, 1 - (1 - p)^CURVE): builds quickly as soon
//   as the zoom starts, then settles.
type BlurPattern = "fast-then-slow" | "slow-then-fast";
const DEFAULT_BLUR_PATTERN: BlurPattern = "slow-then-fast";
const DEFAULT_MAX_BLUR = 100;

// Glass layer in the TV's screen (raw-images/Transparent screen .png ->
// tv-glass.webp, 1536x1024): a mostly see-through pane with a rim and a
// window-glare reflection. It lives inside the TV's own layer, between the
// star and the TV frame image, so the bezel overlaps its edges and it
// moves/zooms exactly with the TV. Its visible pane (x 35-1508, y 34-981 of
// the image, measured off its alpha) is fit to the TV's see-through screen
// hole (x 529-1461, y 98-671 of tv-with-table.webp's 2000x1128) times
// DEFAULT_GLASS_SIZE, so >1 tucks the rim under the bezel. Size, opacity
// and nudges are tunable in the dev tuner.
const DEFAULT_GLASS_ON = true;
const DEFAULT_GLASS_SIZE = 1.07; // set via the dev tuner
const DEFAULT_GLASS_OPACITY = 0.36; // set via the dev tuner
const DEFAULT_GLASS_X = 0; // % of the TV's width
const DEFAULT_GLASS_Y = 0; // % of the TV's height
const HOLE = { cx: (529 + 1461) / 2 / 2000, cy: (98 + 671) / 2 / 1128, w: 932 / 2000, h: 573 / 1128 };
const GLASS_PANE = { cx: (35 + 1508) / 2 / 1536, cy: (34 + 981) / 2 / 1024, w: 1473 / 1536, h: 947 / 1024 };

// The TV's screen, behind the frame and glass, filling the see-through
// hole (padded 3% each way so its edges hide under the bezel). Off by
// default: a dark grey-green CRT tube with a vignette (after the user's
// reference photo; its warm lamp-reflection glows were removed per request).
// The power button turns it on like an old CRT: a bright horizontal line
// that opens up into the full picture with a brief flash; turning off
// collapses it to a line, then a dot, then fades. The picture itself
// (channels/video, static, on-screen display) is TvPicture in TvScreen.tsx.
const SCREEN_PAD = 1.03;
const SCREEN_BOX = {
  left: `${(HOLE.cx - (HOLE.w * SCREEN_PAD) / 2) * 100}%`,
  top: `${(HOLE.cy - (HOLE.h * SCREEN_PAD) / 2) * 100}%`,
  width: `${HOLE.w * SCREEN_PAD * 100}%`,
  height: `${HOLE.h * SCREEN_PAD * 100}%`,
};
const SCREEN_OFF_BG = [
  // dark band of the room behind
  "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.1) 100%)",
  // the tube: lighter in the middle, darker at the edges
  "radial-gradient(ellipse 75% 70% at 50% 46%, #4b5049 0%, #3a3e38 55%, #262924 100%)",
].join(", ");
// What the TV shows when it's on (channels, video, static, on-screen
// display) lives in TvScreen.tsx — that's also where to add videos.
const CRT_VARIANTS: Variants = {
  on: {
    opacity: [1, 1, 1, 1],
    scaleX: [0, 1, 1, 1],
    scaleY: [0.012, 0.012, 1, 1],
    filter: ["brightness(5)", "brightness(4)", "brightness(1.6)", "brightness(1)"],
    // short pause first, so the power LED lights before the picture
    transition: { duration: 0.75, times: [0, 0.25, 0.6, 1], delay: 0.15, ease: "easeOut" },
  },
  off: {
    opacity: [1, 1, 1, 0],
    scaleX: [1, 1, 0.012, 0],
    scaleY: [1, 0.012, 0.012, 0.012],
    filter: ["brightness(1)", "brightness(3)", "brightness(5)", "brightness(5)"],
    transition: { duration: 0.6, times: [0, 0.45, 0.8, 1], ease: "easeIn" },
  },
};

// Reduced motion: switch instantly, no flash.
const CRT_VARIANTS_INSTANT: Variants = {
  on: { opacity: 1, scaleX: 1, scaleY: 1, filter: "brightness(1)", transition: { duration: 0 } },
  off: { opacity: 0, scaleX: 0, scaleY: 0.012, filter: "brightness(1)", transition: { duration: 0 } },
};

function glassStyle(size: number, x: number, y: number) {
  const w = (HOLE.w * size) / GLASS_PANE.w; // fraction of TV width
  const h = (HOLE.h * size) / GLASS_PANE.h; // fraction of TV height
  return {
    width: `${w * 100}%`,
    height: `${h * 100}%`,
    left: `${(HOLE.cx - GLASS_PANE.cx * w) * 100 + x}%`,
    top: `${(HOLE.cy - GLASS_PANE.cy * h) * 100 + y}%`,
  };
}
const PEOPLE_BLUR_CURVE = 3;

// Reduced-motion users get the static scene (no pin, no zoom). Server
// render assumes no zoom, so the first paint matches either way.
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PHONE_MQ = "(max-width: 424px)";
function subscribePhone(cb: () => void) {
  const mq = window.matchMedia(PHONE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const clampNum = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function layout(scale: number, surface: number, star: number) {
  const tvWidth = (TV_SHARE / scale) * 100;
  const padding = ((surface * TV_SHARE) / scale - SURFACE_IN_IMAGE * CABINET_ASPECT) * 100;
  const starWidth = STAR_WIDTH_PER_UNIT * star; // fraction of TV width
  // How far the star's tips reach above the TV's top edge (they sit on a
  // near-circle, so this holds at any rotation), as % of the wrapper.
  const starOverhang = Math.max(0, (starWidth * STAR_ASPECT) / 2 - TV_CENTER_Y * TV_ASPECT) * tvWidth;
  return {
    maxWidth: Math.round((TV_PX_AT_CAP / TV_SHARE) * scale),
    tvWidth,
    tvLeft: (100 - tvWidth) / 2,
    padding,
    starWidth: starWidth * 100,
    starOverhang,
  };
}

export default function TvOnCabinet({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [surface, setSurface] = useState(DEFAULT_SURFACE);
  const [star, setStar] = useState(DEFAULT_STAR);
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [peopleY, setPeopleY] = useState(DEFAULT_PEOPLE_Y);
  const [blurPattern, setBlurPattern] = useState<BlurPattern>(DEFAULT_BLUR_PATTERN);
  const [maxBlur, setMaxBlur] = useState(DEFAULT_MAX_BLUR);
  const [stops, setStops] = useState<StopSettings>(DEFAULT_STOPS);
  // Read live by the scroll-stop handlers, so tuning never restarts them.
  const stopsRef = useRef(stops);
  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);
  const tv = useTvState();
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_MQ).matches, () => false);
  const tvOn = tv.on;
  const reduceMotion = useReducedMotion();
  const [glass, setGlass] = useState({
    on: DEFAULT_GLASS_ON,
    size: DEFAULT_GLASS_SIZE,
    opacity: DEFAULT_GLASS_OPACITY,
    x: DEFAULT_GLASS_X,
    y: DEFAULT_GLASS_Y,
  });
  const { maxWidth, tvWidth, tvLeft, padding, starWidth, starOverhang } = layout(scale, surface, star);

  // --- Zoom pin geometry (all px, measured from the rendered scene) ---
  // The scene sits in a 100vh sticky "camera" frame inside a taller track
  // (100vh + ZOOM_SCROLL_VH). frameOffset positions the scene inside the
  // frame so the screen center lands at SCREEN_VIEWPORT_Y; the track gets
  // the opposite negative margin so the scene's resting spot on the page
  // (and the 80px gap to the heading above) is unchanged before the pin.
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null); // the pink panel (the chatai's pinned frame copies it)
  const zoomEnabled = useSyncExternalStore(
    subscribeReducedMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const [geo, setGeo] = useState({ originX: 0, originY: 0, frameOffset: 0, zoom: 1, distance: 0, vh: 0, headingTop: 0, peopleDrop: 0, cover: null as null | { left: number; top: number; width: number; height: number } });
  // Height of the after-zoom content (heading + photo); it grows with its
  // content, and the pink panel is sized to cover all of it.
  const afterRef = useRef<HTMLDivElement>(null);
  const [afterH, setAfterH] = useState(0);
  useEffect(() => {
    const el = afterRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAfterH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomEnabled]);

  const measure = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const w = scene.offsetWidth;
    const tvW = (tvWidth / 100) * w;
    const tvH = tvW * TV_ASPECT;
    const tvLeftPx = (tvLeft / 100) * w;
    const tvTopPx = (starOverhang / 100) * w;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // Not laid out yet (first frame, hidden tab): a 0 size would make the
    // zoom infinite and every derived value NaN. Measure again on resize.
    if (!(w > 0 && tvW > 0 && vw > 0 && vh > 0)) return;
    // Pinned frame: screen center at SCREEN_VIEWPORT_Y of the window. On
    // tall windows (portrait tablets) that leaves the cabinet ending above
    // the window's bottom, showing the audience's cut edge and bare wall
    // below; there the frame sits lower instead, so the cabinet's bottom
    // edge meets the window's bottom (the pin, and so the scroll, stops
    // earlier). Phones keep the centered screen.
    const centered = vh * SCREEN_VIEWPORT_Y - (tvTopPx + SCREEN_CY * tvH);
    const frameOffset = vw >= TABLET_MIN_W ? Math.max(centered, vh - scene.offsetHeight) : centered;
    // End frame: biggest zoom that still fits the TV region in the window.
    const regionH = (END_BOTTOM - END_TOP) * tvH;
    const zoom = Math.max(1.01, Math.min(vh / regionH, (END_WIDTH_MARGIN * vw) / (END_WIDTH * tvW)));
    // Scaling about a fixed origin O maps a point X to O + s(X - O). Pick O
    // so that at the end zoom the region's center C lands on the window's
    // center T (both in the scene's own unscaled px): O = (T - zoom*C)/(1 - zoom).
    const cX = tvLeftPx + TV_BODY_CX * tvW;
    const cY = tvTopPx + ((END_TOP + END_BOTTOM) / 2) * tvH;
    const tX = vw / 2 - (vw - w) / 2;
    const tY = vh / 2 - frameOffset;
    const originY = (tY - zoom * cY) / (1 - zoom);
    // Lace bottom in the window at max zoom; the spacer's top is the
    // window's bottom edge at that moment (the track ends there).
    const clothBottom = frameOffset + originY + zoom * (tvTopPx + CLOTH_BOTTOM * tvH - originY);
    // Audience: its tuned lift (peopleY% of its own height) can leave its
    // cropped bottom edge above the window's bottom in the pinned frame on
    // some window shapes, showing a hard cut with cabinet below. Drop it just
    // enough that its bottom sits at or below the window's bottom, but never
    // below the cabinet's own bottom edge (on tall/portrait windows the
    // cabinet ends above the window's bottom; there the audience's cut edge
    // lines up with the cabinet's bottom instead of floating below it).
    const peopleH = ((PEOPLE_WIDTH_PER_UNIT * people * tvWidth) / 100) * w * (599 / 1094);
    const lift = (-peopleY / 100) * peopleH; // how far its bottom sits above the cabinet's
    // In tv-audience.webp the left figures' bodies end at row ~574 of 599
    // (only some figures run to the edge), so align THAT line, not the
    // image's bottom edge, with the window's bottom (+2px for rounding).
    const peopleBottom = scene.offsetHeight - lift - peopleH * (1 - 574 / 599) - 2; // scene px
    const peopleDrop = clampNum(vh - frameOffset - peopleBottom, 0, Math.max(0, lift));
    const originX = (tX - zoom * cX) / (1 - zoom);
    // The dark cover only has to hide what's on screen. In the scene's own
    // px the window is the rect V below; zooming by k about the origin O
    // shows O + (V - O)/k, which always lies inside the box around V and O.
    // (The bottom is extended in render for the scroll after the zoom.)
    const vLeft = -(vw - w) / 2;
    const vTop = -frameOffset;
    const coverLeft = Math.min(vLeft, originX) - 2;
    const coverTop = Math.min(vTop, originY) - 2;
    const coverRight = Math.max(vLeft + vw, originX) + 2;
    const coverBottom = Math.max(vTop + vh, originY) + 2;
    setGeo({
      originX,
      originY,
      frameOffset,
      zoom,
      distance: vh * ZOOM_SCROLL_VH,
      // Panel height in the scene's own (unscaled) px: enough to fill the
      // window and the extra scroll after the zoom, at the final zoom.
      vh,
      headingTop: clothBottom - vh + HEADING_GAP,
      peopleDrop,
      cover: { left: coverLeft, top: coverTop, width: coverRight - coverLeft, height: coverBottom - coverTop },
    });
  }, [tvWidth, tvLeft, starOverhang, people, peopleY]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (sceneRef.current) ro.observe(sceneRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Progress = how far the track has scrolled past the pin point (its top
  // reaching the viewport top), over the zoom distance. Exponential so the
  // zoom feels like a steady camera move rather than speeding up.
  const { scrollY } = useScroll();
  const zoomScale = useTransform(scrollY, () => {
    const track = trackRef.current;
    if (!zoomEnabled || !track || geo.distance <= 0) return 1;
    const p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / geo.distance));
    return Math.pow(geo.zoom, p);
  });

  // 0 until DARKEN_START of the zoom, then eases to 1 at the end.
  // Zoom progress as a motion value, so crossing POWER_ON_AT can drive the
  // TV's power without re-rendering on every scroll frame.
  const zoomProgress = useTransform(scrollY, () => {
    const track = trackRef.current;
    if (!zoomEnabled || !track || geo.distance <= 0) return 0;
    return Math.min(1, Math.max(0, -track.getBoundingClientRect().top / geo.distance));
  });
  const [poweredByScroll, setPoweredByScroll] = useState(false);
  const [autoPress, setAutoPress] = useState(0);
  useMotionValueEvent(zoomProgress, "change", (p) => {
    const w = document.documentElement.clientWidth;
    const reached = p >= (w >= TABLET_MIN_W && w < DESKTOP_MIN_W ? POWER_ON_AT_TABLET : POWER_ON_AT);
    if (reached === poweredByScroll) return;
    setPoweredByScroll(reached);
    tv.setPower(reached);
    setAutoPress((n) => n + 1); // press the power button visibly
  });


  // Soft scroll stops (see DEFAULT_STOPS above). Driven through the app's Lenis
  // instance; inactive without it (reduced motion) or before measuring.
  useEffect(() => {
    const lenis = getLenis();
    if (!lenis || !zoomEnabled || geo.distance <= 0) return;
    let lastWheel = 0;
    let busy = false;
    let held = false;
    let heldAt = 0;
    let holdDir = 0;
    let tail = Infinity; // smallest |delta| seen while held (momentum trough)
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      clearTimeout(holdTimer);
      held = false;
      busy = false;
      lenis.start();
    };
    const onWheel = (e: WheelEvent) => {
      lastWheel = performance.now();
      const cfg = stopsRef.current;
      if (!held || lastWheel - heldAt < cfg.holdMin) {
        if (held) tail = Math.min(tail, Math.abs(e.deltaY));
        return;
      }
      const d = Math.abs(e.deltaY);
      const reversed = Math.sign(e.deltaY) !== 0 && Math.sign(e.deltaY) !== holdDir;
      if (reversed || d >= tail * cfg.newGesture + 6) release();
      else tail = Math.min(tail, d);
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    const hold = (dir: number) => {
      lenis.stop(); // swallows input while held
      held = true;
      heldAt = performance.now();
      holdDir = dir;
      tail = Infinity;
      const check = () => {
        const now = performance.now();
        const cfg = stopsRef.current;
        if (now - heldAt >= cfg.holdMin && now - lastWheel >= cfg.quiet) release();
        else holdTimer = setTimeout(check, 50);
      };
      holdTimer = setTimeout(check, 50);
    };

    // Smoothed real scroll speed (px/s, signed).
    let lastPos = lenis.animatedScroll;
    let lastT = performance.now();
    let speed = 0;
    const off = lenis.on("scroll", (l) => {
      const now = performance.now();
      const dt = now - lastT;
      const inst = dt > 0 ? ((l.animatedScroll - lastPos) / dt) * 1000 : 0;
      speed = dt > 120 ? inst : speed * 0.4 + inst * 0.6;
      lastPos = l.animatedScroll;
      lastT = now;
      if (busy || !trackRef.current) return;
      // Wheel/trackpad only; touch and keyboard keep their native feel.
      if (now - lastWheel > 300) return;
      const cfg = stopsRef.current;
      const v = speed;
      if (Math.abs(v) < cfg.minSpeed) return;
      const trackTop = trackRef.current.getBoundingClientRect().top + window.scrollY;
      const cur = l.animatedScroll;
      const target = l.targetScroll;
      const points = [cfg.pin && trackTop, cfg.end && trackTop + geo.distance].filter((y): y is number => y !== false);
      for (const stop of points) {
        // Inclusive: wheel steps can land the target exactly on the stop.
        const crossing = v > 0 ? cur < stop - 1 && target >= stop : cur > stop + 1 && target <= stop;
        if (!crossing) continue;
        busy = true;
        // easeOutQuart starts at 4x its average speed: pick the duration
        // that makes that start speed equal the current speed.
        const duration = Math.min(cfg.glideMax, Math.max(Math.min(cfg.glideMin, cfg.glideMax), (4 * Math.abs(stop - cur)) / Math.abs(v)));
        l.scrollTo(stop, {
          duration,
          easing: (t: number) => 1 - Math.pow(1 - t, 4),
          lock: true,
          force: true,
          onComplete: () => hold(Math.sign(v)),
        });
        break;
      }
    });

    return () => {
      off();
      window.removeEventListener("wheel", onWheel);
      clearTimeout(holdTimer);
      if (busy) lenis.start();
    };
  }, [zoomEnabled, geo.distance]);

  const darkness = useTransform(scrollY, () => {
    const track = trackRef.current;
    if (!zoomEnabled || !track || geo.distance <= 0) return 0;
    const p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / geo.distance));
    const t = Math.min(1, Math.max(0, (p - DARKEN_START) / (1 - DARKEN_START)));
    return t * t * (3 - 2 * t);
  });
  const shadowOpacity = useTransform(() => darkness.get() * CLOTH_SHADOW_OPACITY);
  const cabinetFilter = useTransform(darkness, (d) => `brightness(${(1 - 0.88 * d).toFixed(3)})`);
  // Cabinet and people fade out completely by the end of the zoom, leaving
  // only the TV and its cloth over the gradient panel below.
  const fadeOut = useTransform(darkness, (d) => 1 - d);

  // Parallax on the audience only, per request — they're the foreground,
  // so they move faster than the TV/cabinet behind them. 0 at the pin
  // point, so the pinned frame shows them exactly at their tuned position.
  // Approaching (track still below the pin): they sit lower by
  // PEOPLE_PARALLAX of the remaining distance (capped at one viewport) and
  // rise into place faster than the scene. During the zoom: they drop out
  // of frame faster than the camera's push-in would carry them (up to
  // PEOPLE_ZOOM_DROP of the viewport height on screen, divided by the
  // current zoom since this offset sits inside the scaled scene).
  const peopleParallaxY = useTransform(scrollY, () => {
    const track = trackRef.current;
    if (!zoomEnabled || !track) return 0;
    const rel = track.getBoundingClientRect().top;
    const vh = window.innerHeight;
    if (rel > 0) return Math.min(rel, vh) * PEOPLE_PARALLAX;
    if (geo.distance <= 0) return 0;
    const p = Math.min(1, -rel / geo.distance);
    return (p * PEOPLE_ZOOM_DROP * vh) / Math.pow(geo.zoom, p);
  });

  // 0 before the pin, then rises with zoom progress. The blur radius is
  // divided by the current zoom because the filter is applied inside the
  // scaled scene, so this keeps the on-screen blur at the intended amount.
  // Blur settings live in motion values (mirrored from state) so switching
  // them in the tuner re-renders the blur immediately, without a scroll.
  // (1 = slow-then-fast, 0 = fast-then-slow; numeric so all inputs share a type)
  const slowFirstMV = useMotionValue(blurPattern === "slow-then-fast" ? 1 : 0);
  const maxBlurMV = useMotionValue(maxBlur);
  useEffect(() => {
    slowFirstMV.set(blurPattern === "slow-then-fast" ? 1 : 0);
    maxBlurMV.set(maxBlur);
  }, [blurPattern, maxBlur, slowFirstMV, maxBlurMV]);

  const peopleBlur = useTransform<number, string>([scrollY, slowFirstMV, maxBlurMV], ([, slowFirst, max]) => {
    const track = trackRef.current;
    if (!zoomEnabled || !track || geo.distance <= 0) return "blur(0px)";
    const p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / geo.distance));
    const eased = slowFirst ? Math.pow(p, PEOPLE_BLUR_CURVE) : 1 - Math.pow(1 - p, PEOPLE_BLUR_CURVE);
    return `blur(${((eased * max) / Math.pow(geo.zoom, p)).toFixed(2)}px)`;
  });

  // Phone: no TV scene or zoom, just the pink "Who is this Ankit?" panel
  // as a plain section (see PhoneProducts).
  if (phone) return <PhoneProducts />;

  return (
    <>
      <div className="w-full">
      <div
        ref={trackRef}
        className="w-full"
        style={zoomEnabled ? { height: `calc(100vh + ${geo.distance}px)`, marginTop: -geo.frameOffset } : undefined}
      >
      <div
        className={zoomEnabled ? "pointer-events-none sticky top-0 flex h-screen w-full flex-col items-center" : "flex w-full flex-col items-center"}
      >
      {/* isolate: its own stacking context, so the star's z-index:-1
          (below) sits behind the cabinet and TV but stays above the
          page's wall background instead of dropping behind it. */}
      <motion.div
        ref={sceneRef}
        // Portrait tablets start closer in: the scene is laid out 161% of
        // the row's width (the cabinet runs off both sides, centered), so
        // the TV is already at the size the user picked before the zoom
        // begins.
        className="pointer-events-auto relative isolate w-full max-w-[var(--scene-max)] shrink-0 tablet:portrait:w-[161%] tablet:portrait:max-w-none desktop:portrait:w-full desktop:portrait:max-w-[var(--scene-max)]"
        style={{
          ["--scene-max" as string]: `${maxWidth}px`,
          marginTop: zoomEnabled ? geo.frameOffset : 0,
          scale: zoomScale,
          transformOrigin: `${geo.originX}px ${geo.originY}px`,
        }}
      >
        <div aria-hidden="true" style={{ paddingTop: `${starOverhang + padding}%` }} />
        {/* Dark grey backdrop for the end of the zoom: z -9 puts it above
            the star (-10) and below the TV's screen (-8), glass and frame.
            Just big enough to cover the window at every zoom level (see
            measure), not a huge layer the browser struggles to draw. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -z-[9]"
          style={{
            ...(geo.cover
              ? {
                  ...geo.cover,
                  // plus the scroll after the zoom, as the pinned frame moves up
                  // off the window (screen px over the final zoom), like the panel
                  height: geo.cover.height + (geo.vh + Math.max(afterH, geo.vh * AFTER_ZOOM_VH) + 40) / geo.zoom,
                }
              : { inset: 0 }),
            background: DARK_BG,
            opacity: darkness,
          }}
        />
        <motion.img
          src="/images/tv-table.webp"
          alt=""
          aria-hidden="true"
          width={2400}
          height={1351}
          loading="lazy"
          className="block h-auto w-full select-none"
          style={{ filter: cabinetFilter, opacity: fadeOut }}
        />
        {/* marginTop % also resolves against the wrapper's width; it drops
            the TV below the star tips' headroom. */}
        <div className="absolute top-0" style={{ left: `${tvLeft}%`, width: `${tvWidth}%`, marginTop: `${starOverhang}%` }}>
          {/* "VIBE COADING" ribbons behind the star (z -11): two full-width
              rows scrolling in opposite directions, stacked and centered
              ~29% down the TV image (upper half of the screen). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-[11] flex w-screen flex-col overflow-hidden select-none"
            style={{ top: "29%", left: "50%", translate: "-50% -50%", rowGap: "0.24em", fontSize: "clamp(32px, 5.5vw, 80px)" }}
          >
            <VibeRibbon duration={40} />
            <VibeRibbon duration={40} reverse />
          </div>
          {/* Purple star behind the TV: tv-star.svg is a straight copy of
              raw-images/Star.svg (the designer's near-circular 12-point
              export, 710x728). Sits behind the TV and cabinet, centered on
              the TV body's own center —
              49.88% across / 40.74% down tv-with-table.webp (TV body spans
              x 385-1610, y 0-919 of 2000x1128, measured off the image, lace
              excluded). Width is (710/960) x DEFAULT_STAR of the TV image's
              width — native 710px when the TV is at its 960px desktop size,
              times the star multiplier — scaling with the TV below that. */}
          {/* Fades out with the cabinet at the end of the zoom, so its lower
              tips never show up as dark cones under the lace once the
              cabinet in front of them is gone. */}
          <motion.img
            src="/graphics/tv-star.svg"
            alt=""
            aria-hidden="true"
            width={710}
            height={728}
            // Continuous rotation per request: .animate-spin-slow animates
            // the standalone `rotate` property (40s/turn inline, instead of
            // that class's 180s default; off under reduced motion via
            // globals.css). Centering uses the standalone `translate`
            // property, NOT transform: CSS applies translate -> rotate ->
            // transform, so a transform-based -50%/-50% offset gets rotated
            // too and the star orbits instead of spinning in place.
            className="animate-spin-slow pointer-events-none absolute -z-10 h-auto max-w-none select-none"
            style={{ left: "49.88%", top: "40.74%", width: `${starWidth}%`, translate: "-50% -50%", animationDuration: "40s", opacity: fadeOut }}
          />
          {/* TV screen: z -8, above the star (-10) and below the glass
              (-5) and TV frame, so the frame's bezel covers its edges. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-[8] overflow-hidden"
            style={{ ...SCREEN_BOX, background: SCREEN_OFF_BG }}
          >
            <motion.div
              className="absolute inset-0"
              variants={reduceMotion ? CRT_VARIANTS_INSTANT : CRT_VARIANTS}
              initial={false}
              animate={tvOn ? "on" : "off"}
            >
              <TvPicture
                on={tv.on}
                channel={tv.channel}
                playing={tv.playing}
                volume={tv.volume}
                osd={tv.osd}
                staticId={tv.staticId}
                info={tv.info}
              />
            </motion.div>
          </div>
          {/* Glass pane in the screen: z -5 puts it above the screen (-8)
              and below the TV frame image (in-flow, z auto). */}
          {glass.on && (
            // eslint-disable-next-line @next/next/no-img-element -- large decorative raster sized via CSS
            <img
              src="/images/tv-glass.webp"
              alt=""
              aria-hidden="true"
              width={1536}
              height={1024}
              loading="lazy"
              className="pointer-events-none absolute -z-[5] max-w-none select-none"
              style={{ ...glassStyle(glass.size, glass.x, glass.y), opacity: glass.opacity }}
            />
          )}
          {/* Gradient panel under the cloth: z -6, above the dark backdrop
              (-9) and below the TV image (whose cloth overlaps its top). It
              sits behind the cabinet (in flow) until that fades out. */}
          {zoomEnabled && (
            <motion.div
              ref={panelRef}
              aria-hidden="true"
              className="pointer-events-none absolute -z-[6]"
              style={{
                // Fades in as the cabinet fades out, so it never peeks out
                // below a narrow (mobile) cabinet before the zoom.
                opacity: darkness,
                top: `${UNDER_CLOTH_TOP * 100}%`,
                left: `${UNDER_CLOTH_X[0] * 100}%`,
                width: `${(UNDER_CLOTH_X[1] - UNDER_CLOTH_X[0]) * 100}%`,
                // Window at max zoom + the after-zoom content, in the
                // scene's own (unscaled) px.
                height: (geo.vh + Math.max(afterH, geo.vh * AFTER_ZOOM_VH) + 40) / geo.zoom,
                background: UNDER_CLOTH_BG,
              }}
            >
              {/* The panel's z-index makes it its own stacking context, so
                  the multiply blend applies to the pink beneath only. */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url('${FABRIC_SRC}')`,
                  backgroundRepeat: "repeat",
                  backgroundSize: `${FABRIC_TILE_PX / geo.zoom}px auto`,
                  mixBlendMode: "multiply",
                  opacity: FABRIC_OPACITY,
                }}
              />
            </motion.div>
          )}
          {zoomEnabled && (
            <motion.img
              src="/images/tv-with-table.webp"
              alt=""
              aria-hidden="true"
              width={2000}
              height={1128}
              loading="lazy"
              className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-auto w-full select-none"
              style={{
                translate: `0 ${CLOTH_SHADOW_OFFSET}%`,
                filter: `brightness(0) blur(${CLOTH_SHADOW_BLUR}px)`,
                opacity: shadowOpacity,
                clipPath: `inset(${CLOTH_SHADOW_CLIP_TOP * 100}% -5% -10% -5%)`,
              }}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- large decorative raster sized via CSS */}
          <img
            src="/images/tv-with-table.webp"
            alt="Retro TV on a lace-covered wooden cabinet"
            width={2000}
            height={1128}
            loading="lazy"
            className="block h-auto w-full select-none"
          />
          <TvPowerContext.Provider value={{ ...tv.remote, autoPress }}>
            {children}
          </TvPowerContext.Provider>
        </div>

        {/* Audience watching the TV, per request on the highest z-index:
            last in paint order plus z-20, so it sits in front of the
            cabinet, TV and star. Anchored to the cabinet's bottom edge,
            centered (the people are cropped at the image's bottom, so it
            reads as them standing in the foreground). pointer-events-none
            so it never blocks the TV buttons. */}
        <motion.img
          src="/images/tv-audience.webp"
          alt=""
          aria-hidden="true"
          width={1094}
          height={599}
          loading="lazy"
          className="pointer-events-none absolute bottom-0 left-1/2 z-20 h-auto max-w-none select-none"
          style={{ width: `${PEOPLE_WIDTH_PER_UNIT * people * tvWidth}%`, translate: `-50% calc(${peopleY}% + ${zoomEnabled && Number.isFinite(geo.peopleDrop) ? geo.peopleDrop : 0}px)`, y: peopleParallaxY, filter: peopleBlur, opacity: fadeOut }}
        />
      </motion.div>
      </div>
      </div>
      {/* Extra scroll after the zoom: the pinned frame releases and the
          page scrolls on, bringing the gradient panel up into view. */}
      {zoomEnabled && (
        <div
          ref={afterRef}
          className="relative z-10 w-full px-4"
          style={{ minHeight: `${AFTER_ZOOM_VH * 100}vh`, paddingTop: Number.isFinite(geo.headingTop) ? Math.max(0, geo.headingTop) : 0, paddingBottom: AFTER_CONTENT_BOTTOM }}
        >
          <WhoIsAnkit />
          {/* <TvChatai panelRef={panelRef} /> */}
          <TvShelf />
        </div>
      )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <CabinetTuner
          scale={scale}
          surface={surface}
          star={star}
          onScale={setScale}
          onSurface={setSurface}
          onStar={setStar}
          people={people}
          peopleY={peopleY}
          onPeople={setPeople}
          onPeopleY={setPeopleY}
          blurPattern={blurPattern}
          maxBlur={maxBlur}
          onBlurPattern={setBlurPattern}
          onMaxBlur={setMaxBlur}
          glass={glass}
          onGlass={(patch) => setGlass((g) => ({ ...g, ...patch }))}
          stops={stops}
          onStops={(patch) => setStops((st) => ({ ...st, ...patch }))}
        />
      )}
    </>
  );
}

// The wire shelf after the "Who is this Ankit?" section: 120px below its
// paragraph, the "I Also Like to Explore" rule (Figma "Frame 42": Arvo 32px
// #B9B7B7 between two #B9B7B7 lines), the shelf, then 180px before the panel ends.
const SHELF_TOP_GAP = 120;
const SHELF_LABEL_GAP = 56;
const SHELF_BOTTOM_GAP = 180;
function TvShelf() {
  return (
    // phone: 60px above and below; tablet: 64px below the paragraph and
    // 110px below the shelf; desktop: SHELF_TOP_GAP / SHELF_BOTTOM_GAP
    <div
      className="mb-[60px] mt-[60px] flex flex-col items-center tablet:mb-[110px] tablet:mt-[64px] desktop:mb-[var(--shelf-bottom)] desktop:mt-[var(--shelf-top)]"
      style={{ ["--shelf-top" as string]: `${SHELF_TOP_GAP}px`, ["--shelf-bottom" as string]: `${SHELF_BOTTOM_GAP}px` }}
    >
      {/* tablet: same line length as every other section divider (10vw) */}
      <div className="flex w-auto max-w-[637px] items-center gap-4 sm:gap-12 tablet:w-auto tablet:gap-[48px] desktop:w-full desktop:gap-12">
        <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-[#B9B7B7] tablet:w-[10vw] tablet:flex-none desktop:flex-1" />
        <h3
          className="shrink-0 text-center"
          style={{
            fontFamily: "var(--font-arvo)",
            fontWeight: 400,
            fontSize: "clamp(20px, 2.3vw, 32px)",
            lineHeight: 1.5,
            color: "#B9B7B7",
          }}
        >
          I Also Like to Explore
        </h3>
        <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-[#B9B7B7] tablet:w-[10vw] tablet:flex-none desktop:flex-1" />
      </div>
      {/* tablet: the shelf sits closer under the label (24px) */}
      <div className="mt-[var(--shelf-label-gap)] w-full tablet:mt-[24px] desktop:mt-[var(--shelf-label-gap)]" style={{ ["--shelf-label-gap" as string]: `${SHELF_LABEL_GAP}px` }}>
        <WireShelf />
      </div>
    </div>
  );
}

// --- Chatai section, commented out (replaced by TvShelf above) ---
// // The unrolling chatai after the "Who is this Ankit?" section, on the same
// // pink panel: spaced and timed from that section's paragraph (its gap and
// // highlight line), with a seamless copy of the panel behind its pinned frame.
// function TvChatai({ panelRef }: { panelRef: RefObject<HTMLDivElement | null> }) {
//   const gap = useSectionGap();
//   return (
//     <ChataiUnroll
//       style={{ marginTop: gap }}
//       startLine={HIGHLIGHT_LINE}
//       startGapPx={gap}
//       backdrop={{ panelRef, background: UNDER_CLOTH_BG, fabricSrc: FABRIC_SRC, fabricTilePx: FABRIC_TILE_PX, fabricOpacity: FABRIC_OPACITY }}
//       print={FRIDGE_PRINT}
//     >
//       {/* stickers under the fan layer, so the fan's shadow passes over them */}
//       <FridgeStickers />
//       <FanShadow />
//     </ChataiUnroll>
//   );
// }
//
// // Printed into the chatai's white middle (Figma "Frame 44"): Arvo 68px
// // uppercase navy title, "My Memories" in Merriweather 28px with rules, 80%
// // opacity. Module-level so the chatai's scene isn't rebuilt every render.
// const FRIDGE_PRINT: ChataiPrint = {
//   title: "My Fridge Magnet Collection",
//   subtitle: "My Memories",
//   color: "#012755",
//   subColor: "#325175",
//   opacity: 0.8,
// };

// Dev-only live tuning panel (never rendered in a production build).
// Drag the sliders, then share the numbers to make them the defaults.
function CabinetTuner({
  scale,
  surface,
  star,
  onScale,
  onSurface,
  onStar,
  people,
  peopleY,
  onPeople,
  onPeopleY,
  blurPattern,
  maxBlur,
  onBlurPattern,
  onMaxBlur,
  glass,
  onGlass,
  stops,
  onStops,
}: {
  scale: number;
  surface: number;
  star: number;
  onScale: (v: number) => void;
  onSurface: (v: number) => void;
  onStar: (v: number) => void;
  people: number;
  peopleY: number;
  onPeople: (v: number) => void;
  onPeopleY: (v: number) => void;
  blurPattern: BlurPattern;
  maxBlur: number;
  onBlurPattern: (v: BlurPattern) => void;
  onMaxBlur: (v: number) => void;
  glass: { on: boolean; size: number; opacity: number; x: number; y: number };
  onGlass: (patch: Partial<{ on: boolean; size: number; opacity: number; x: number; y: number }>) => void;
  stops: StopSettings;
  onStops: (patch: Partial<StopSettings>) => void;
}) {
  const [open, setOpen] = useState(false); // starts collapsed to the "Table tuner" pill

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[2000] rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg"
        style={{ cursor: "pointer" }}
      >
        Table tuner
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[2000] max-h-[calc(100vh-2rem)] w-[280px] overflow-y-auto rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur"
      style={{ cursor: "auto" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Table tuner (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>

      <label className="mb-1 flex justify-between">
        <span>Table size</span>
        <span className="tabular-nums">{Math.round((scale - 1) * 100)}% bigger</span>
      </label>
      <input
        type="range"
        min={1}
        max={1.6}
        step={0.01}
        value={scale}
        onChange={(e) => onScale(Number(e.target.value))}
        className="mb-4 w-full"
        style={{ cursor: "pointer" }}
      />

      <label className="mb-1 flex justify-between">
        <span>Table position</span>
        <span className="tabular-nums">{surface.toFixed(3)}</span>
      </label>
      <input
        type="range"
        min={0.2}
        max={0.55}
        step={0.001}
        value={surface}
        onChange={(e) => onSurface(Number(e.target.value))}
        className="mb-1 w-full"
        style={{ cursor: "pointer" }}
      />
      <div className="mb-4 flex justify-between opacity-60">
        <span>higher</span>
        <span>lower</span>
      </div>

      <label className="mb-1 flex justify-between">
        <span>Star size</span>
        <span className="tabular-nums">{Math.round((star - 1) * 100)}% bigger</span>
      </label>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.01}
        value={star}
        onChange={(e) => onStar(Number(e.target.value))}
        className="mb-4 w-full"
        style={{ cursor: "pointer" }}
      />

      <label className="mb-1 flex justify-between">
        <span>People size</span>
        <span className="tabular-nums">{Math.round(people * 100)}%</span>
      </label>
      <input
        type="range"
        min={0.4}
        max={1.6}
        step={0.01}
        value={people}
        onChange={(e) => onPeople(Number(e.target.value))}
        className="mb-4 w-full"
        style={{ cursor: "pointer" }}
      />

      <label className="mb-1 flex justify-between">
        <span>People position</span>
        <span className="tabular-nums">{peopleY}</span>
      </label>
      <input
        type="range"
        min={-80}
        max={60}
        step={1}
        value={peopleY}
        onChange={(e) => onPeopleY(Number(e.target.value))}
        className="mb-1 w-full"
        style={{ cursor: "pointer" }}
      />
      <div className="mb-4 flex justify-between opacity-60">
        <span>higher</span>
        <span>lower</span>
      </div>

      <div className="mb-1">People blur pattern</div>
      <div className="mb-4 grid grid-cols-2 gap-1.5">
        {(
          [
            ["fast-then-slow", "Fast, then slow"],
            ["slow-then-fast", "Slow, then fast"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onBlurPattern(value)}
            className={`rounded-md py-1.5 ${blurPattern === value ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"}`}
            style={{ cursor: "pointer" }}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-1 flex justify-between">
        <span>Max people blur</span>
        <span className="tabular-nums">{maxBlur}px</span>
      </label>
      <input
        type="range"
        min={0}
        max={150}
        step={1}
        value={maxBlur}
        onChange={(e) => onMaxBlur(Number(e.target.value))}
        className="mb-4 w-full"
        style={{ cursor: "pointer" }}
      />

      <div className="mb-1 flex items-center justify-between">
        <span>Screen glass</span>
        <button
          type="button"
          onClick={() => onGlass({ on: !glass.on })}
          className={`rounded-md px-3 py-1 ${glass.on ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"}`}
          style={{ cursor: "pointer" }}
        >
          {glass.on ? "On" : "Off"}
        </button>
      </div>
      {(
        [
          ["Glass size", "size", 0.9, 1.15, 0.005, (v: number) => `${Math.round(v * 100)}%`],
          ["Glass opacity", "opacity", 0, 1, 0.01, (v: number) => `${Math.round(v * 100)}%`],
          ["Glass left / right", "x", -5, 5, 0.1, (v: number) => v.toFixed(1)],
          ["Glass up / down", "y", -5, 5, 0.1, (v: number) => v.toFixed(1)],
        ] as const
      ).map(([label, key, min, max, step, fmt]) => (
        <div key={key}>
          <label className="mb-1 mt-2 flex justify-between">
            <span>{label}</span>
            <span className="tabular-nums">{fmt(glass[key])}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={glass[key]}
            onChange={(e) => onGlass({ [key]: Number(e.target.value) })}
            className="w-full"
            style={{ cursor: "pointer" }}
          />
        </div>
      ))}
      <div className="mb-4" />

      <div className="mb-1 font-semibold">Scroll breaks (fast scroll only)</div>
      {(
        [
          ["pin", "Break at zoom start"],
          ["end", "Break at max zoom"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="mb-1.5 flex items-center gap-2" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={stops[key]} onChange={(e) => onStops({ [key]: e.target.checked })} style={{ cursor: "pointer" }} />
          <span>{label}</span>
        </label>
      ))}
      {(
        [
          ["Counts as fast above", "minSpeed", 600, 5000, 50, (v: number) => `${v} px/s`],
          ["Shortest glide", "glideMin", 0.1, 1, 0.05, (v: number) => `${v.toFixed(2)}s`],
          ["Longest glide", "glideMax", 0.2, 2, 0.05, (v: number) => `${v.toFixed(2)}s`],
          ["Shortest hold", "holdMin", 0, 1000, 10, (v: number) => `${v}ms`],
          ["Release after quiet", "quiet", 40, 500, 10, (v: number) => `${v}ms`],
          ["New swipe strength", "newGesture", 1.1, 4, 0.1, (v: number) => `${v.toFixed(1)}x`],
        ] as const
      ).map(([label, key, min, max, step, fmt]) => (
        <div key={key}>
          <label className="mb-1 mt-2 flex justify-between">
            <span>{label}</span>
            <span className="tabular-nums">{fmt(stops[key])}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={stops[key]}
            onChange={(e) => onStops({ [key]: Number(e.target.value) })}
            className="w-full"
            style={{ cursor: "pointer" }}
          />
        </div>
      ))}
      <div className="mb-1 mt-1 opacity-60">Lower speed = more scrolls get caught. Lower hold/quiet/strength = less effort to move on.</div>
      <div className="mb-4" />

      <button
        type="button"
        onClick={() => {
          onScale(DEFAULT_SCALE);
          onSurface(DEFAULT_SURFACE);
          onStar(DEFAULT_STAR);
          onPeople(DEFAULT_PEOPLE);
          onPeopleY(DEFAULT_PEOPLE_Y);
          onBlurPattern(DEFAULT_BLUR_PATTERN);
          onMaxBlur(DEFAULT_MAX_BLUR);
          onGlass({
            on: DEFAULT_GLASS_ON,
            size: DEFAULT_GLASS_SIZE,
            opacity: DEFAULT_GLASS_OPACITY,
            x: DEFAULT_GLASS_X,
            y: DEFAULT_GLASS_Y,
          });
          onStops(DEFAULT_STOPS);
        }}
        className="w-full rounded-md bg-white/15 py-1.5 hover:bg-white/25"
        style={{ cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
}

// One "VIBE COADING ◆" ribbon row (Figma: Arvo 700 80px, #BFBFBF, 32px
// diamond, 40px gaps). The track holds two identical halves and slides by
// -50% (.animate-marquee), so the loop is seamless; reverse runs it the
// other way. Paused under reduced motion via globals.css.
const RIBBON_REPEAT = 6; // segments per half; covers wide screens
function VibeRibbon({ duration, reverse = false }: { duration: number; reverse?: boolean }) {
  const half = Array.from({ length: RIBBON_REPEAT }, (_, i) => (
    <span key={i} className="flex shrink-0 items-center gap-10 pr-10">
      <span>VIBE COADING</span>
      <span
        className="block aspect-square w-[0.4em] bg-[#BFBFBF]"
        style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
      />
    </span>
  ));
  return (
    <div
      className="animate-marquee flex w-max whitespace-nowrap text-[#BFBFBF]"
      style={{
        fontFamily: "var(--font-arvo)",
        fontWeight: 700,
        lineHeight: 1.17,
        animationDuration: `${duration}s`,
        animationDirection: reverse ? "reverse" : "normal",
      }}
    >
      {half}
      {half}
    </div>
  );
}

// Phone version of this section: "Product I Build" (the TV and its channel
// videos) and the wire shelf are left out for now, so only the pink panel
// with "Who is this Ankit?" is shown, as a plain section.
function PhoneProducts() {
  return (
    <div className="w-full">
      {/* the pink fabric panel, full width (out of the row's 16px gutters) */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 pb-[80px] pt-[80px]" style={{ background: UNDER_CLOTH_BG }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: `url('${FABRIC_SRC}')`, backgroundRepeat: "repeat", backgroundSize: `${FABRIC_TILE_PX}px auto`, mixBlendMode: "multiply", opacity: FABRIC_OPACITY }}
        />
        <div className="relative">
          <WhoIsAnkit />
        </div>
      </div>
    </div>
  );
}
