// "Mandala activation": the loader's second ending (no three.js / WebGL).
// When the fingertips touch, the central mandala awakens and opens the site:
//
//   0.0-0.3  a soft warm golden pulse at the centre (no white flash)
//   0.3-0.9  the mandala lights up from the centre outwards (a bright-gold
//            copy revealed through a growing soft circle), its outline drawn
//            in gold (SVG stroke-dash) with a shimmer running round it, and
//            the whole mandala turning ~8 degrees clockwise
//   0.9-1.5  the lit mandala swells, and a soft golden ring travels out to
//            the edges of the screen, a few gold motes drifting with it
//   1.0-2.2  the loader opens from the centre behind the ring (a radial-
//            gradient mask), the mandala, motes and characters fade, and
//            the site (already loaded underneath) is left clean
//
// Everything moves by transform and opacity, except the opening (a mask
// radius) and the outline's stroke offsets; one GSAP timeline runs it all.

type Gsap = typeof import("gsap").gsap;

export const MANDALA_DURATION = 2.25; // s, the touch to the end (the last motes fade by then)

export type MandalaRevealEls = {
  root: HTMLElement; // the whole loader
  box: HTMLElement; // the mandala's container (rotates and swells)
  litWrap: HTMLElement; // soft circular window onto the lit mandala (scaled from 0)
  litInner: HTMLElement; // counter-scaled, so the lit mandala itself stays put
  litLine: SVGSVGElement; // the outline: a drawn stroke and a travelling shimmer
  pulse: HTMLElement; // the warm glow at the centre
  wave: HTMLElement; // the travelling golden ring
  fade: HTMLElement[]; // the figures and anything else that fades out at the end
};

// `scrub`: start paused and keep everything at the end, so the timeline can
// be moved to any moment (the loader preview)
export function playMandalaReveal(els: MandalaRevealEls, gsap: Gsap, hooks: { onReveal: () => void; onDone: () => void }, reduced = false, scrub = false) {
  const { root } = els;
  const w = root.clientWidth, h = root.clientHeight;
  const far = Math.hypot(w, h) / 2; // centre to the corners
  const S = far / 900; // tuned for a laptop screen

  if (reduced && !scrub) {
    // reduced motion: no movement, just a quick fade to the site
    hooks.onReveal();
    return gsap.to(root, { opacity: 0, duration: 0.4, ease: "power1.out", onComplete: hooks.onDone });
  }

  const draw = els.litLine.querySelector<SVGPathElement>("[data-draw]");
  const shimmer = els.litLine.querySelector<SVGPathElement>("[data-shimmer]");

  // a few gold motes drifting out with the ring (created now, removed at the end)
  const motes: HTMLElement[] = [];
  for (let i = 0; i < 26; i++) {
    const m = document.createElement("div");
    const size = (3 + Math.random() * 5) * S;
    m.setAttribute("aria-hidden", "true");
    Object.assign(m.style, {
      position: "absolute",
      left: `${w / 2 - size / 2}px`,
      top: `${h / 2 - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255, 226, 150, 0.95) 0%, rgba(242, 181, 68, 0.6) 45%, rgba(242, 181, 68, 0) 75%)",
      opacity: "0",
      pointerEvents: "none",
      willChange: "transform, opacity",
    });
    root.appendChild(m);
    motes.push(m);
  }

  // the opening to the site: a soft-edged hole in the loader, radius `hole`
  const open = { r: 0 };
  const soft = 90 * S;
  const setHole = () => {
    const m = open.r <= 0 ? "" : `radial-gradient(circle at 50% 50%, transparent ${open.r.toFixed(1)}px, #000 ${(open.r + soft).toFixed(1)}px)`;
    root.style.maskImage = m;
    root.style.setProperty("-webkit-mask-image", m);
  };

  // the lit mandala's window grows from the centre; its content is
  // counter-scaled so the lines don't move, only more of them light up
  const lit = { s: 0.04 };
  const setLit = () => {
    els.litWrap.style.transform = `scale(${lit.s})`;
    els.litInner.style.transform = `scale(${1 / lit.s})`;
  };
  setLit();

  const tl = gsap.timeline({
    paused: scrub,
    onComplete: () => {
      if (scrub) return;
      motes.forEach((m) => m.remove());
      hooks.onDone();
    },
  });
  tl
    // 1. the pulse
    .fromTo(els.pulse, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }, 0)
    // 2. the mandala lights up, centre outwards, and turns a little
    .set(els.litWrap, { opacity: 1 }, 0.25)
    .to(lit, { s: 1, duration: 0.65, ease: "power1.inOut", onUpdate: setLit }, 0.25)
    .to(els.litLine, { opacity: 1, duration: 0.2 }, 0.3)
    .fromTo(draw, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power1.inOut" }, 0.3)
    .fromTo(shimmer, { opacity: 0, attr: { "stroke-dashoffset": 0 } }, { opacity: 1, attr: { "stroke-dashoffset": -1.6 }, duration: 1.1, ease: "none" }, 0.4)
    .to(els.box, { rotation: 8, duration: 1.2, ease: "sine.inOut" }, 0.3)
    .to(els.pulse, { opacity: 0.55, scale: 1.4, duration: 0.6, ease: "sine.out" }, 0.3)
    // 3. the mandala swells; the golden ring travels out to the edges
    .to(els.box, { scale: 1.3, duration: 0.6, ease: "power2.inOut" }, 0.9)
    .fromTo(els.wave, { opacity: 0, scale: 0.05 }, { opacity: 1, duration: 0.15, ease: "power1.out" }, 0.9)
    .to(els.wave, { scale: 1.12, duration: 1.3, ease: "power2.out" }, 0.9)
    .to(els.wave, { opacity: 0, duration: 0.45, ease: "power1.in" }, 1.75)
    .call(hooks.onReveal, [], 1.0)
    // 4. the loader opens behind the ring, and everything fades away
    .to(open, { r: far + soft + 20, duration: 1.2, ease: "power2.inOut", onUpdate: setHole }, 1.0)
    .to([els.box, els.pulse, ...els.fade], { opacity: 0, duration: 0.6, ease: "power1.in" }, 1.5);
  motes.forEach((m) => {
    const a = Math.random() * Math.PI * 2, d = far * (0.35 + Math.random() * 0.75);
    tl.fromTo(
      m,
      { x: 0, y: 0, opacity: 0 },
      { x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0.9, duration: 1.2, ease: "power2.out" },
      0.9 + Math.random() * 0.15,
    ).to(m, { opacity: 0, duration: 0.5, ease: "power1.in" }, 1.6);
  });
  // development only: lets a test jump to any moment (window.__mandalaTl.pause(seconds))
  if (process.env.NODE_ENV !== "production") (window as unknown as { __mandalaTl?: unknown }).__mandalaTl = tl;
  return tl;
}
