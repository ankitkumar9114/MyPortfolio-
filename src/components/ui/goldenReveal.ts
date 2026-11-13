// The loader's ending, drawn on a 2D canvas over the loader: at 1.76 s (just
// before the fingertips meet), a golden wave opens the site from the centre - the
// loader cut away along its ragged edge (MughalFrame applies the same edge
// as a clip-path), the edge itself a glowing golden line - while the mandala
// and the characters light up. No particles, rings or sparks.
//
// Timeline (seconds from the start of the reveal, one GSAP timeline; the canvas reads its
// time every frame):
//   0.00-1.20  the reveal: the wave runs out from the centre to the corners
//   1.20-1.70  the glowing edge fades; then the loop stops

type Gsap = typeof import("gsap").gsap;
type Timeline = ReturnType<Gsap["timeline"]>;

// how ragged the reveal wave's edge is (px on a laptop screen), and its shape
// at angle a, time t: -1..1 (MughalFrame's cut uses the same formula)
export const WAVE_RAG = 16;
export const waveEdge = (a: number, t: number) =>
  0.55 * Math.sin(7 * a + 2.1 * t) + 0.3 * Math.sin(13 * a - 2.9 * t + 1.7) + 0.15 * Math.sin(23 * a + 4.3 * t + 0.6);

// the timeline (s from the touch)
const REVEAL_START = 0; // the site starts to show straight away
const REVEAL_END = REVEAL_START + 1.2;
const END = REVEAL_END + 0.5;
export const GOLDEN_DURATION = END;

// the edge's colours: antique gold glow, a warm hot line (never white)
const GOLD = [217, 162, 58];
const HOT = [255, 226, 150];
const rgba = (c: number[], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

export type Hooks = {
  // the reveal each frame: the wave's radius and raggedness (px) at time t,
  // for the loader's cut; null before the reveal / once it's gone
  cut: (wave: { radius: number; rag: number; time: number } | null) => void;
  mandala: (glow: number) => void; // 0..1: how lit-up the mandala (and the characters) are
  onReveal: () => void; // the wave starts (the site begins to show)
  onDone: () => void; // all over
};

export type GoldenReveal = {
  // `scrub`: the timeline starts paused and is never torn down at the end,
  // so it can be moved to any moment (the loader preview); returns it
  play: (hooks: Hooks, opts?: { scrub?: boolean }) => Timeline;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createGoldenReveal(canvas: HTMLCanvasElement, width: number, height: number, gsap: Gsap): GoldenReveal | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let w = width, h = height;
  const pr = Math.min(Math.min(w, h) < 600 ? 1 : 1.25, window.devicePixelRatio || 1);
  const far = () => Math.hypot(w, h) / 2; // centre to the corners
  const S = () => far() / 900; // sizes are tuned for a laptop screen
  const waveEnd = () => far() + WAVE_RAG * S() * 2 + 30 * S(); // past the corners, raggedness included

  const resize = (W: number, H: number) => {
    w = W;
    h = H;
    canvas.width = Math.round(w * pr);
    canvas.height = Math.round(h * pr);
  };
  resize(w, h);

  let tl: Timeline | null = null;
  let raf = 0, alive = true;
  const st = { wave: 0, edge: 0, mandala: 0 }; // what the timeline animates

  // the wave's glowing golden edge
  const draw = (t: number) => {
    const s = S(), cx = w / 2, cy = h / 2;
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const r0 = st.wave * waveEnd();
    if (st.edge < 0.01 || r0 < 1) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, r = r0 + WAVE_RAG * s * waveEdge(a, t);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineJoin = "round";
    // a wide soft glow, a narrower one, then the bright line
    ctx.strokeStyle = rgba(GOLD, 0.18 * st.edge);
    ctx.lineWidth = 26 * s;
    ctx.stroke();
    ctx.strokeStyle = rgba(GOLD, 0.35 * st.edge);
    ctx.lineWidth = 10 * s;
    ctx.stroke();
    ctx.strokeStyle = rgba(HOT, 0.9 * st.edge);
    ctx.lineWidth = 2.2 * s;
    ctx.stroke();
  };

  const dispose = () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    tl?.kill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const play = (hooks: Hooks, opts: { scrub?: boolean } = {}) => {
    let revealStarted = false;
    const frame = () => {
      if (!alive) return;
      const t = tl ? tl.time() : 0; // the timeline is the one clock
      draw(t);
      if (t >= REVEAL_START) {
        if (!revealStarted) {
          revealStarted = true;
          hooks.onReveal();
        }
        hooks.cut({ radius: st.wave * waveEnd(), rag: WAVE_RAG * S(), time: t });
      } else hooks.cut(null);
      hooks.mandala(st.mandala);
      raf = requestAnimationFrame(frame);
    };
    tl = gsap.timeline({
      paused: !!opts.scrub,
      onComplete: () => {
        if (opts.scrub) return; // kept, so it can be moved back
        hooks.cut(null);
        dispose();
        hooks.onDone();
      },
    });
    tl
      // the glow: the mandala and the characters light up at the touch, then fade
      .to(st, { mandala: 1, duration: 0.2, ease: "power2.out" }, 0)
      .to(st, { mandala: 0, duration: 0.9, ease: "power1.in" }, 0.3)
      // the reveal and its glowing edge
      .to(st, { edge: 1, duration: 0.12 }, REVEAL_START)
      .to(st, { wave: 1, duration: REVEAL_END - REVEAL_START, ease: "power2.inOut" }, REVEAL_START)
      .to(st, { edge: 0, duration: END - REVEAL_END, ease: "power1.in" }, REVEAL_END);
    // development only: lets a test jump to any moment
    if (process.env.NODE_ENV !== "production") (window as unknown as { __goldenTl?: unknown }).__goldenTl = tl;
    raf = requestAnimationFrame(frame);
    return tl;
  };

  return { play, resize, dispose };
}
