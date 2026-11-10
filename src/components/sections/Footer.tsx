"use client";

import { useContactDetails, type ContactDetails } from "@/lib/contactDetails";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { playComputerHover, playPhoneRing } from "./footerSounds";

// Footer: the last section, a landscape scene at the very end of the page.
// Built as a stack of layers for an upcoming parallax effect; each layer is
// a full-width image anchored to the footer's bottom. Layers so far:
//   1. "last layer" (back): sky + far palms and fields, covering the footer
//      raw-images/FOOTER -last layer.png -> public/images/footer/sky.webp
//   2. the heading block: "hover on devices" rule + "Let's Connect & / Build Something"
//   3. "base layer" (front): the courtyard, house and buffalo; its top is
//      transparent, so the sky shows above the wall. It sits OVER the heading
//      and sets the footer's height (full width, its own aspect).
//      raw-images/Footer-base layer.png -> public/images/footer/base.webp
//   4. "main character": Ankit at his table on the courtyard ground, center
//      raw-images/footer- main character.png -> public/images/footer/character.webp
//      (transparent margin trimmed so the table spans the image's full width)
//      + its table props: an old computer, a rotary telephone and a resume
//      (raw-images/resume image.png -> public/images/footer/resume.webp, trimmed)
//   5. "tree" (top-most): a banyan on its stone platform, standing in the
//      courtyard, over everything else.
//      raw-images/Footer-Tree.png -> public/images/footer/tree.webp (trimmed)
//
// Every layer's position and size is live-tunable in a dev-only panel
// (desktop, shown while the footer is on screen); share the numbers to make
// them the defaults below.
const SKY = { src: "/images/footer/sky.webp", w: 1672, h: 642 };
const BASE = { src: "/images/footer/base.webp", w: 3053, h: 1372 };
const TREE = { src: "/images/footer/tree.webp", w: 1827, h: 1343 };
const TREE_WIDTH = 42; // % of the footer's width at size 100%
// Portrait tablet (150%-wide scene): the window's left edge sits at 16.67% of the
// scene; the tree shifts in a little, keeping its foliage clear of the heading.
const TREE_LEFT_TABLET = "2%";
const TREE_LEFT_PHONE = "30%";
const CHARACTER = { src: "/images/footer/character.webp", w: 1100, h: 902 };
const CHARACTER_WIDTH = 36; // % of the footer's width at size 100% (30% + 20%)
// The character also never gets taller than CHARACTER_MAX_VH of the window
// (at its tuned 187% size): on short/wide screens it shrinks with the
// screen's height instead of only following the width, so it stays in
// proportion to the screen.
const CHARACTER_MAX_VH = 0.96; // 0.8 + 20%
const CHARACTER_W_CSS = `min(${CHARACTER_WIDTH}%, ${(((CHARACTER_MAX_VH * CHARACTER.w) / CHARACTER.h / 1.87) * 100).toFixed(2)}vh)`;
// Parallax strength per layer: offset at the start of the footer's entrance,
// in window heights (- = up, + = down), easing to 0 at the page's end.
const PARALLAX = { sky: -0.1, base: 0.08, character: 0.19, tree: 0.18 };
// The heading ends lower than its tuned top, tucked behind the character's
// head: its last line's bottom sinks this many font-sizes below the top of
// his head, on every screen (measured from the layout, not a fixed amount).
const HEADING_TUCK = 0.5;
const PHONE_HEADING_TOP = 64; // phone: px from the footer's top to the heading block
// phone: the scene is this much shorter, so the character sits closer
// under the heading (less empty sky between them)
const PHONE_HEIGHT_FACTOR = 0.88;
const PHONE_SKY_LIFT = 8; // phone: extra upward shift of the sky, % of its height
const PHONE_HEAD_GAP = 20; // phone: minimum px between the heading and his head
const PHONE_MQ = "(max-width: 424px)";
const TOUCH_PARALLAX_STRENGTH = 0.6; // phone/tablet parallax distance vs desktop
const TABLET_MQ = "(min-width: 425px) and (max-width: 1024px)";
// tablet: extra share of the scene's height shown below the usual crop
// (~85px), for the bottom nav to sit over
const TABLET_EXTRA_VISIBLE = 0.12;
function subscribeTablet(cb: () => void) {
  const mq = window.matchMedia(TABLET_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function subscribePhone(cb: () => void) {
  const mq = window.matchMedia(PHONE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const TAG_SIDE_PAD = 22; // px (pre-scale) of space left/right of the label
const TAG_SIZE = 0.79; // hover tag size vs the Figma frame (79%)
// What the table props do: computer -> email, telephone -> WhatsApp chat,
// resume -> the resume on Google Drive (same link as the header's "Resume").
// Contact details come from the CMS (/admin → Contact details).
type PropKind = "computer" | "telephone" | "resume";
function contactLinks({ email, whatsapp, resume }: ContactDetails): Record<PropKind, { label: string; href: string; aria: string; newTab: boolean }> {
  return {
    computer: { label: "Mail me", href: `mailto:${email}`, aria: `Email Ankit (${email})`, newTab: false },
    telephone: { label: "WhatsApp me", href: `https://wa.me/${whatsapp}`, aria: "Chat with Ankit on WhatsApp", newTab: true },
    resume: { label: "My resume", href: resume, aria: "Open Ankit's resume", newTab: true },
  };
}

// Props standing on the character's table (raw-images/Computer.png,
// Telephone.png, resume image.png): positions in % of the character image (left / bottom edge
// / width), so they stay on the tabletop as the character moves or scales.
const PROPS: { kind: PropKind; src: string; alt: string; w: number; h: number; left: number; bottom: number; width: number }[] = [
  { kind: "computer", src: "/images/footer/computer.webp", alt: "An old beige computer on the table", w: 259, h: 197, left: 18, bottom: 51, width: 31 },
  { kind: "telephone", src: "/images/footer/telephone.webp", alt: "A black rotary telephone on the table", w: 155, h: 91, left: 58.5, bottom: 53, width: 17.7 },
  { kind: "resume", src: "/images/footer/resume.webp", alt: "Ankit's resume lying on the table", w: 700, h: 306, left: 75, bottom: 49.5, width: 18.5 },
];

// x / y: % of the footer's width / height (+ = right / down).
// scale: 1 = as laid out. Heading top in px from the footer's top.
type LayerPos = { x: number; y: number; scale: number };
type FooterSettings = { height: number; visible: number; sky: LayerPos; base: LayerPos; character: LayerPos; computer: LayerPos; telephone: LayerPos; resume: LayerPos; tree: LayerPos; headingTop: number; headingX: number; headingScale: number };
// height: the footer's height vs the courtyard image's own (full width).
const DEFAULT_FOOTER: FooterSettings = {
  height: 1.36, // set via the dev tuner
  visible: 0.965, // share of the scene's height shown: the page ends there
  sky: { x: 0, y: -15.5, scale: 1 },
  base: { x: 3, y: 31.5, scale: 1.34 },
  // character / tree: x/y in % of their own size, from their spots
  // (character: bottom center; tree: bottom-left)
  character: { x: 0, y: 50, scale: 1.87 },
  // computer: nudge from its spot on the table (x/y % of its own size)
  computer: { x: -5, y: 5, scale: 1 },
  telephone: { x: -14, y: 9, scale: 1 },
  resume: { x: 0, y: 0, scale: 1 },
  tree: { x: -100.5, y: -45, scale: 2.27 },
  headingTop: 120,
  headingX: 0,
  headingScale: 1,
};

const layerStyle = (l: LayerPos = { x: 0, y: 0, scale: 1 }) => ({
  translate: `${l.x}% ${l.y}%`,
  scale: String(l.scale),
  transformOrigin: "50% 100%", // grow from the bottom center
});

export default function Footer() {
  const contact = useContactDetails();
  const CONTACT_LINKS = contactLinks(contact);
  const { email: EMAIL, phone: PHONE } = contact;
  const [saved, setSt] = useState<FooterSettings>(DEFAULT_FOOTER);
  // Hovered table prop: the computer hums/beeps and lights his face, the
  // telephone rings, shakes and grows a little (see .footer-prop).
  const [active, setActive] = useState<PropKind | null>(null);
  const stopSound = useRef<(() => void) | null>(null);
  const onPropEnter = (kind: PropKind) => {
    stopSound.current?.();
    stopSound.current = kind === "computer" ? playComputerHover() : kind === "telephone" ? playPhoneRing() : null;
    setActive(kind);
  };
  const onPropLeave = () => {
    stopSound.current?.();
    stopSound.current = null;
    setActive(null);
  };
  useEffect(() => () => stopSound.current?.(), []);
  // Fill any setting the state lacks from the defaults (state kept across a
  // hot reload can predate a newly added layer, e.g. the tree).
  const st: FooterSettings = { ...DEFAULT_FOOTER, ...saved };
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_MQ).matches, () => false);
  const sceneH = st.height * (phone ? PHONE_HEIGHT_FACTOR : 1);
  const tablet = useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET_MQ).matches, () => false);
  // tablet: the footer shows a little more of the scene below the table (the
  // legs, chair and ground), under the blurred strip the bottom nav sits on
  const visible = st.visible + (tablet ? TABLET_EXTRA_VISIBLE : 0);
  const ref = useRef<HTMLElement>(null);

  // Parallax: while the footer scrolls in (its top entering at the window's
  // bottom -> the page's end), each layer is offset by a share of the window
  // height that eases to 0, so they all land on the tuned layout at the end:
  //   sky: starts higher and drifts slower (far away),
  //   heading: starts at its tuned spot in the sky and sinks down, ending
  //   behind the character,
  //   courtyard: starts a little lower and settles slowly,
  //   character (+ table props): starts lower and rises faster than the
  //   courtyard, so he slides into place in front of it,
  //   tree: starts lower and moves faster (closest to you).
  const reduceMotion = useReducedMotion();
  const noParallax = reduceMotion;
  // Phone and tablet: a softer parallax, so it stays smooth on touch screens
  // (desktop unchanged). The layers follow an eased copy of the scroll
  // progress instead of jumping with every touch-scroll step, move 60% as
  // far, and are kept on their own GPU layers (will-change) so they're
  // moved, not redrawn, each frame.
  const touch = phone || tablet;
  const strength = touch ? TOUCH_PARALLAX_STRENGTH : 1;
  const { scrollYProgress: rawProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const easedProgress = useSpring(rawProgress, { stiffness: 120, damping: 26, mass: 0.35, restDelta: 0.0005 });
  const scrollYProgress = touch ? easedProgress : rawProgress;
  const layerWillChange = touch ? "transform" : undefined;
  // window height, set after mount (0 on the server and the first render, so
  // the server HTML and hydration match)
  const vh = useMotionValue(0);
  useEffect(() => {
    const set = () => vh.set(window.innerHeight);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, [vh]);
  const shift = (k: number) => ([p, h]: number[]) => (noParallax ? 0 : k * strength * (1 - p) * h);
  const skyY = useTransform([scrollYProgress, vh], shift(PARALLAX.sky));
  const treeY = useTransform([scrollYProgress, vh], shift(PARALLAX.tree));
  const baseY = useTransform([scrollYProgress, vh], shift(PARALLAX.base));
  const characterY = useTransform([scrollYProgress, vh], shift(PARALLAX.character));
  // heading (reversed): starts at its tuned spot in the open sky (offset 0)
  // and sinks by headEnd px, so its bottom ends HEADING_TUCK font-sizes into
  // the character's head (same overlap on every screen)
  const headingRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLImageElement>(null);
  const headEnd = useMotionValue(0);
  const headingY = useTransform([scrollYProgress, headEnd], ([p, e]: number[]) => (noParallax ? e : e * p));
  useEffect(() => {
    const footer = ref.current, h2 = headingRef.current, ch = characterRef.current;
    if (!footer || !h2 || !ch) return;
    // From layout positions (offsetTop/offsetHeight ignore transforms, so
    // this doesn't depend on where the parallax animation currently is):
    // both are measured in the scene's coordinates (same origin).
    const measure = () => {
      const wrap = ch.parentElement;
      if (!wrap) return;
      // heading's resting bottom (scaled from its top)
      const headingBottom = h2.offsetTop + h2.offsetHeight * st.headingScale;
      // character's resting top: layout box, + its translate (y% of its own
      // height), scaled about its bottom edge
      const H = wrap.offsetHeight;
      const headTop = wrap.offsetTop + (st.character.y / 100) * H + H * (1 - st.character.scale);
      // font size of the heading text itself (the block's own is the default)
      const fs = parseFloat(getComputedStyle(h2.querySelector("[data-footer-heading]") ?? h2).fontSize) || 0;
      // (can be negative: where it already sits too low, it rises a little,
      // so it never hides more than HEADING_TUCK behind him)
      // phone: the heading block ends PHONE_HEADING_TOP px below the footer's
      // top, but always at least PHONE_HEAD_GAP above his head (on the
      // narrowest phones that lifts it a little)
      if (window.matchMedia(PHONE_MQ).matches) headEnd.set(Math.min(PHONE_HEADING_TOP - h2.offsetTop, headTop - PHONE_HEAD_GAP - headingBottom));
      else headEnd.set(headTop + HEADING_TUCK * fs - headingBottom);
    };
    measure();
    // re-measure whenever the footer, the heading or the character changes
    // size (window resize, size settings, character resized in code)
    const ro = new ResizeObserver(measure);
    ro.observe(footer);
    ro.observe(h2);
    ro.observe(ch);
    ch.addEventListener("load", measure);
    return () => {
      ro.disconnect();
      ch.removeEventListener("load", measure);
    };
    // no deps: re-subscribe after every render, so the observers always
    // watch the current heading/character elements (a hot reload or a
    // heading change swaps the element, and a stale observer would leave the
    // heading parked at an old, wrong depth behind his head)
  });
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || process.env.NODE_ENV !== "development") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // The page ends at the footer's bottom: the scene is laid out at its full
    // height but only its top `visible` share is shown (the footer's box), so
    // anything below (table legs, ground) is cropped and scrolling stops there.
    // The tree may still rise above the footer, over the purple section.
    // Phone (340%) and portrait tablet (150%): the whole scene is laid out
    // wider than the window (centered, sides cropped
    // by the wrapper), so the character at his table is bigger and the
    // footer taller; the tree is moved in so it stays on screen at the left.
    <div className="w-full overflow-x-clip">
    <footer
      ref={ref}
      id="contact"
      aria-label="Footer"
      className="relative isolate z-10 -ml-[120%] w-[340%] tablet:ml-0 tablet:w-full tablet:portrait:-ml-[25%] tablet:portrait:w-[150%] desktop:portrait:ml-0 desktop:portrait:w-full"
      style={{ aspectRatio: `${BASE.w} / ${BASE.h * sceneH * visible}` }}
    >
      {/* clips at the footer's bottom and sides, open 150vh upward */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: "calc(100% + 150vh)" }}>
      {/* the full scene, top aligned with the footer's top */}
      <div className="absolute inset-x-0" style={{ top: "150vh", aspectRatio: `${BASE.w} / ${BASE.h * sceneH}` }}>
      {/* tablet: open at the bottom, so the courtyard continues into the
          footer's extra height below the scene */}
      <div className="absolute inset-0 overflow-hidden tablet:overflow-visible tablet:[clip-path:inset(0_0_-100%_0)] desktop:overflow-hidden desktop:[clip-path:none]">
      <motion.img
        src={SKY.src}
        alt=""
        aria-hidden="true"
        width={SKY.w}
        height={SKY.h}
        loading="lazy"
        // the base layer is taller than the sky's aspect: cover the whole
        // footer, kept anchored to the bottom
        className="pointer-events-none absolute inset-0 block h-full w-full select-none object-cover object-bottom"
        // phone: nudged up a little more (still clipped at the footer's top,
        // so it never covers the purple section above)
        style={{ ...layerStyle(phone ? { ...st.sky, y: st.sky.y - PHONE_SKY_LIFT } : st.sky), y: skyY, willChange: layerWillChange }}
      />
      {/* Heading over the sky, under the base layer (Figma: Arvo 700 100px,
          uppercase, white, soft drop shadow, 1186px wide) */}
      {/* Heading block (Figma "Frame 2085665006"): a "hover on devices" rule
          above "Let's Connect & / Build Something", 28px apart, 755px wide */}
      <motion.div
        ref={headingRef}
        className="absolute inset-x-0 z-10 mx-auto flex max-w-[100vw] flex-col items-center gap-3 px-4 tablet:max-w-[755px] tablet:gap-[20px] desktop:gap-7 text-center text-white"
        style={{
          y: headingY,
          willChange: layerWillChange,
          top: st.headingTop, // px below the previous (purple) section
          translate: `${st.headingX}% 0`,
          scale: String(st.headingScale),
          transformOrigin: "50% 0",
        }}
      >
        {/* phone: 12vw lines, same as every other phone section divider;
            tablet: same line length as every other tablet section divider */}
        <div className="flex w-auto max-w-[637px] items-center gap-4 sm:gap-12 tablet:w-auto tablet:gap-[48px] desktop:w-full desktop:gap-12">
          <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:bg-[#D3D2D2] tablet:w-[6vw] tablet:flex-none desktop:flex-1" />
          <span
            className="shrink-0"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "clamp(18px, 2vw, 28px)", lineHeight: 1.05, letterSpacing: "0.04em" }}
          >
            {/* touch screens (tablet/phone) have no hover: you tap the devices */}
            <span className="tablet:hidden">click on devices</span>
            <span className="hidden tablet:inline desktop:hidden">click on the devices</span>
            <span className="hidden desktop:inline">hover on devices</span>
          </span>
          <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:w-[6vw] tablet:flex-none desktop:flex-1" />
        </div>
        <h2
          data-footer-heading
          className="uppercase"
          style={{
            fontFamily: "var(--font-arvo)",
            fontWeight: 700,
            fontSize: "clamp(36px, 5vw, 72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textShadow: "0px 4px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* phone: four lines, "Let's / Connect & / Build / Something" */}
          Let&apos;s <br className="tablet:hidden" />
          Connect &amp;
          <br />
          Build <br className="tablet:hidden" />
          Something
        </h2>
      </motion.div>
      <motion.img
        src={BASE.src}
        alt=""
        aria-hidden="true"
        width={BASE.w}
        height={BASE.h}
        loading="lazy"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 block h-auto w-full select-none"
        style={{ ...layerStyle(st.base), y: baseY, willChange: layerWillChange }}
      />
      </div>
      {/* character + the props on his table, moving/sizing together
          (a size container, so the contact text scales with it: cqw) */}
      <motion.div
        // phone: its own width in the 340%-wide scene (else it'd be huge)
        className="pointer-events-none absolute z-20 [--cw:28%] [container-type:inline-size] tablet:[--cw:var(--cw-default)]"
        style={{ ["--cw-default" as string]: CHARACTER_W_CSS, left: "50%", bottom: "4%", width: "var(--cw)", marginLeft: "calc(var(--cw) / -2)", ...layerStyle(st.character), y: characterY, willChange: layerWillChange }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative layer */}
        <img
          ref={characterRef}
          src={CHARACTER.src}
          alt="Ankit sitting at a wooden table in the courtyard"
          width={CHARACTER.w}
          height={CHARACTER.h}
          loading="lazy"
          className="block h-auto w-full select-none"
        />
        {/* phone: a black band from the bottom of the table's front board
            (60.6% of the image) to the footer's end, hiding his legs and the
            chair under the table; wide and tall enough to reach past the
            window's sides and the footer's bottom (both clipped) */}
        <div aria-hidden="true" className="absolute left-1/2 top-[60.6%] h-[200%] w-[400%] -translate-x-1/2 bg-black tablet:hidden" />
        {/* Contact details painted on the table's front board (its apron:
            x 8.7-91.8%, y 54.4-60.6% of the character image) */}
        <div
          // phone: shown in the black band at the bottom instead
          className="absolute hidden items-center justify-center gap-[3.5cqw] tablet:flex"
          style={{ left: "8.7%", width: "83.1%", top: "54.4%", height: "6.2%" }}
        >
          <ContactItem icon="mail" text={EMAIL} href={`mailto:${EMAIL}`} />
          <span aria-hidden="true" className="h-[45%] w-px bg-[#f6e6c8]/40" />
          <ContactItem icon="phone" text={PHONE} href={`tel:${PHONE.replace(/\s/g, "")}`} />
        </div>
        {/* Screen glow on the character while the computer is hovered: a
            flickering cool light from the lower left (where the screen faces
            him), masked to his own silhouette */}
        <div
          aria-hidden="true"
          className={`footer-screen-glow absolute inset-0 ${active === "computer" ? "is-on" : ""}`}
          style={{
            maskImage: `url('${CHARACTER.src}')`,
            WebkitMaskImage: `url('${CHARACTER.src}')`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
        {PROPS.map((pr) => {
          const { kind } = pr;
          const link = CONTACT_LINKS[kind];
          return (
            <div
              key={pr.src}
              // phone: the resume falls off the right edge of the zoomed
              // scene, so it's left out there
              className={`absolute ${kind === "resume" ? "hidden tablet:block" : ""}`}
              style={{
                left: `${pr.left}%`,
                bottom: `${pr.bottom}%`,
                width: `${pr.width}%`,
                ...layerStyle(st[kind]),
              }}
            >
              {/* label tag over the prop while hovered */}
              <PropTag
                label={link.label}
                show={active === kind}
                kind={kind}
                phoneLabel={kind === "computer" ? "Mail" : kind === "telephone" ? "WhatsApp" : link.label}
                // undo the character's + prop's scaling, then size it (TAG_SIZE)
                inv={TAG_SIZE / (st.character.scale * st[kind].scale)}
              />
              <a
                href={link.href}
                target={link.newTab ? "_blank" : undefined}
                rel={link.newTab ? "noopener noreferrer" : undefined}
                aria-label={link.aria}
                className="pointer-events-auto block"
                onPointerEnter={(e) => e.pointerType === "mouse" && onPropEnter(kind)}
                onPointerLeave={(e) => e.pointerType === "mouse" && onPropLeave()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative layer */}
                <img
                  src={pr.src}
                  alt={pr.alt}
                  width={pr.w}
                  height={pr.h}
                  loading="lazy"
                  draggable={false}
                  className={`footer-prop block h-auto w-full select-none ${kind === "computer" ? "is-computer" : ""} ${kind === "telephone" && active === "telephone" ? "is-ringing" : ""}`}
                />
              </a>
            </div>
          );
        })}
      </motion.div>
      <motion.img
        src={TREE.src}
        alt=""
        aria-hidden="true"
        width={TREE.w}
        height={TREE.h}
        loading="lazy"
        // phone: a smaller tree at the window's top-left, rising a little over
        // the purple section (the window starts 35.3% across the 340%-wide
        // scene); 28% wide, its bottom 41% up the footer
        className="pointer-events-none absolute bottom-[41%] left-[var(--tree-left-phone)] z-30 block h-auto w-[28%] select-none tablet:bottom-[6%] tablet:left-[1%] tablet:w-[var(--tree-w)] tablet:portrait:left-[var(--tree-left-tablet)] desktop:portrait:left-[1%]"
        style={{ ["--tree-left-tablet" as string]: TREE_LEFT_TABLET, ["--tree-left-phone" as string]: TREE_LEFT_PHONE, ["--tree-w" as string]: `${TREE_WIDTH}%`, ...layerStyle(st.tree), y: treeY, willChange: layerWillChange }}
      />
      </div>
      </div>
      {/* tablet/desktop: the credit line along the footer's bottom edge, on
          a strip that softly blurs the scene behind it (phone shows it in
          its black band instead) */}
      <div // tablet: tall enough to run behind the bottom nav too (the text sits at
        // its top); desktop: just the text
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 hidden justify-center bg-black/75 pt-1.5 backdrop-blur-[6px] tablet:flex tablet:pb-[84px] desktop:pb-1.5">
        <p className="text-center text-[13px] text-white/85 desktop:text-[14px]" style={{ fontFamily: "var(--font-serif), Merriweather, serif", fontWeight: 400, letterSpacing: "0.01em", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
          Built with{" "}
          <span role="img" aria-label="love" className="text-[#ff4d6d]">
            ♥
          </span>{" "}
          and Claude Code
        </p>
      </div>
      {process.env.NODE_ENV === "development" && inView && <FooterTuner st={st} onChange={setSt} />}
    </footer>
    {/* phone: email and phone number (14px) in the black band at the
        bottom, then the credit line (96px of padding at the end keeps them
        clear of the bottom nav bar). In flow after the footer, pulled up by
        the band's height (19.2vw: 10.4% of the phone footer's height), so it
        starts at the band's top and grows below it as needed. */}
    <div className="relative z-20 -mt-[19.2vw] flex flex-col items-center gap-[10px] bg-black px-4 pb-[96px] pt-[14px] tablet:hidden">
      <ContactItem icon="mail" text={EMAIL} href={`mailto:${EMAIL}`} fontSize="14px" />
      <ContactItem icon="phone" text={PHONE} href={`tel:${PHONE.replace(/\s/g, "")}`} fontSize="14px" />
      <p className="mt-[4px] text-center text-[12px] text-white/60" style={{ fontFamily: "var(--font-serif), Merriweather, serif", fontWeight: 400, letterSpacing: "0.01em" }}>
        Built with{" "}
        <span role="img" aria-label="love" className="text-[#ff4d6d]">
          ♥
        </span>{" "}
        and Claude Code
      </p>
    </div>
    </div>
  );
}

// Dev-only panel (desktop only, collapsible), bottom-left while the footer is
// on screen.
function FooterTuner({ st, onChange }: { st: FooterSettings; onChange: (s: FooterSettings) => void }) {
  const [open, setOpen] = useState(false); // starts collapsed to the "Footer layers" pill
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-20 z-[2000] hidden rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg desktop:block"
        style={{ cursor: "pointer" }}
      >
        Footer layers
      </button>
    );
  }
  const layer = (key: "sky" | "base" | "character" | "computer" | "telephone" | "resume" | "tree", label: string) => (
    <div className="mb-3">
      <div className="mb-1 font-semibold">{label}</div>
      {(
        [
          ["Left / right", "x", -200, 200, 0.5, (v: number) => `${v}%`],
          ["Up / down", "y", -100, 200, 0.5, (v: number) => `${v}%`],
          ["Size", "scale", 0.5, 4, 0.01, (v: number) => `${Math.round(v * 100)}%`],
        ] as const
      ).map(([name, k, min, max, step, fmt]) => (
        <div key={k}>
          <label className="mt-1 flex justify-between">
            <span>{name}</span>
            <span className="tabular-nums">{fmt(st[key][k])}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={st[key][k]}
            onChange={(e) => onChange({ ...st, [key]: { ...st[key], [k]: Number(e.target.value) } })}
            className="w-full"
            style={{ cursor: "pointer" }}
          />
        </div>
      ))}
    </div>
  );
  return (
    <div className="fixed bottom-4 left-4 z-[2000] hidden max-h-[calc(100vh-2rem)] w-[250px] overflow-y-auto rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur desktop:block">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">Footer layers (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>
      <div className="mb-3">
        <label className="flex justify-between font-semibold">
          <span>Footer height</span>
          <span className="tabular-nums">{Math.round(st.height * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.6}
          max={2.5}
          step={0.01}
          value={st.height}
          onChange={(e) => onChange({ ...st, height: Number(e.target.value) })}
          className="w-full"
          style={{ cursor: "pointer" }}
        />
      </div>
      <div className="mb-3">
        <label className="flex justify-between font-semibold">
          <span>Visible (crop bottom)</span>
          <span className="tabular-nums">{Math.round(st.visible * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.005}
          value={st.visible}
          onChange={(e) => onChange({ ...st, visible: Number(e.target.value) })}
          className="w-full"
          style={{ cursor: "pointer" }}
        />
      </div>
      {layer("sky", "Sky (back)")}
      <div className="mb-3">
        <div className="mb-1 font-semibold">Heading</div>
        {(
          [
            ["From top", "headingTop", -200, 700, 1, (v: number) => `${v}px`],
            ["Left / right", "headingX", -50, 50, 0.5, (v: number) => `${v}%`],
            ["Size", "headingScale", 0.4, 1.6, 0.01, (v: number) => `${Math.round(v * 100)}%`],
          ] as const
        ).map(([name, k, min, max, step, fmt]) => (
          <div key={k}>
            <label className="mt-1 flex justify-between">
              <span>{name}</span>
              <span className="tabular-nums">{fmt(st[k])}</span>
            </label>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={st[k]}
              onChange={(e) => onChange({ ...st, [k]: Number(e.target.value) })}
              className="w-full"
              style={{ cursor: "pointer" }}
            />
          </div>
        ))}
      </div>
      {layer("base", "Courtyard (front)")}
      {layer("character", "Main character")}
      {layer("computer", "Computer (on table)")}
      {layer("telephone", "Telephone (on table)")}
      {layer("resume", "Resume (on table)")}
      {layer("tree", "Tree (top-most)")}
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FOOTER)}
        className="mt-1 w-full rounded-md bg-white/15 py-1.5 hover:bg-white/25"
        style={{ cursor: "pointer" }}
      >
        Reset
      </button>
    </div>
  );
}

// One contact line on the table: icon, the text (a mailto/tel link), and a
// copy button that copies the text and briefly shows a tick. Manrope, light cream,
// like paint on the wood, sized with the character (cqw).
function ContactItem({ icon, text, href, fontSize = "1.75cqw" }: { icon: "mail" | "phone"; text: string; href: string; fontSize?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const svg = { width: "1.1em", height: "1.1em", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  return (
    <span
      className="pointer-events-auto flex items-center gap-[0.5em] whitespace-nowrap text-[#f6e6c8]"
      style={{ fontFamily: "var(--font-manrope)", fontWeight: 700, fontSize, letterSpacing: "0.02em", textShadow: "0 1px 0 rgba(0,0,0,0.45)" }}
    >
      {icon === "mail" ? (
        <svg {...svg}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      ) : (
        <svg {...svg}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2z" />
        </svg>
      )}
      <a href={href} className="hover:underline">
        {text}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${icon === "mail" ? "email" : "phone number"}`}
        title={copied ? "Copied!" : "Copy"}
        className="flex items-center rounded opacity-80 transition-opacity hover:opacity-100"
        style={{ cursor: "pointer" }}
      >
        {copied ? (
          <svg {...svg}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg {...svg}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  );
}

// Hover tag over a table prop (Figma "Frame 2085665007"): translucent dark
// box, 2px white border, light blur, Merriweather 24px uppercase label, and a
// 12px white square on each corner. Pops up above the prop.
function PropTag({ label, show, inv, kind, phoneLabel }: { label: string; show: boolean; inv: number; kind?: string; phoneLabel?: string }) {
  return (
    <span
      aria-hidden="true"
      data-kind={kind}
      className={`prop-tag pointer-events-none absolute left-1/2 z-10 ${show ? "is-on" : ""}`}
      style={{ bottom: `calc(100% + ${18 * inv}px)`, ["--inv" as string]: inv }}
    >
      <span className="relative flex border-2 border-white p-[10px] backdrop-blur-[2px]" style={{ background: "rgba(0, 0, 0, 0.4)" }}>
        <span
          // sized to its text with even side padding (both tags share the
          // same height and padding, so each fits its own label)
          className="flex items-center justify-center whitespace-nowrap uppercase text-white"
          style={{ padding: `10px ${TAG_SIDE_PAD}px`, fontFamily: "var(--font-serif), Merriweather, serif", fontWeight: 700, fontSize: 24, lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {/* phone: shorter labels ("Mail", "WhatsApp") */}
          <span className="tablet:hidden">{phoneLabel ?? label}</span>
          <span className="hidden tablet:inline">{label}</span>
        </span>
        {(["-left-[8px] -top-[8px]", "-right-[8px] -top-[8px]", "-left-[8px] -bottom-[8px]", "-right-[8px] -bottom-[8px]"] as const).map((pos) => (
          <span key={pos} className={`absolute h-3 w-3 bg-white ${pos}`} />
        ))}
      </span>
    </span>
  );
}
