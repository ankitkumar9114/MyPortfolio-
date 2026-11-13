// The loader's ending, drawn on a 2D canvas over the loader (no three.js /
// WebGL): when the fingertips touch, an antique-gold spark flares, bursts
// into golden energy (particles, energy rings, a shockwave, curved trails),
// and a golden wave opens the site - the loader cut away along its edge,
// its artwork dissolving into golden flakes - before everything fades.
//
// Timeline (seconds from the explosion, one GSAP timeline; the canvas reads
// its time every frame):
//   0.00-0.06  the spark flares
//   0.06-      the burst: particles, 2 energy rings, a shockwave, trails;
//              the mandala lights up
//   0.10-1.30  the reveal: the wave (a ragged golden line) runs out to the
//              corners; MughalFrame cuts the loader along the same edge
//   1.30-1.80  what's left fades; then the loop stops
//
// Cheap on purpose: a few hundred particles drawn as one pre-made glow
// sprite with additive ("lighter") blending, gradients for the glows, simple
// strokes for the rings, trails and the edge; the canvas at 1x on phones,
// 1.25x elsewhere.

type Gsap = typeof import("gsap").gsap;
type Timeline = ReturnType<Gsap["timeline"]>;

// how ragged the reveal wave's edge is (px on a laptop screen), and its shape
// at angle a, time t: -1..1 (MughalFrame's cut uses the same formula)
export const WAVE_RAG = 16;
export const waveEdge = (a: number, t: number) =>
  0.55 * Math.sin(7 * a + 2.1 * t) + 0.3 * Math.sin(13 * a - 2.9 * t + 1.7) + 0.15 * Math.sin(23 * a + 4.3 * t + 0.6);

// the timeline (s from the explosion)
const SPARK_END = 0.06;
const REVEAL_START = 0.1; // the site starts to show 0.1 s after the explosion
const REVEAL_END = REVEAL_START + 1.2;
const END = REVEAL_END + 0.5;
export const GOLDEN_DURATION = END;

// palette: deep antique gold, amber, warm orange, and a warm hot core (never white)
const GOLD = [217, 162, 58];
const AMBER = [242, 181, 68];
const ORANGE = [232, 137, 43];
const HOT = [255, 226, 150];
const rgba = (c: number[], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

export type Hooks = {
  // the reveal each frame: the wave's radius and raggedness (px) at time t,
  // for the loader's cut; null before the reveal / once it's gone
  cut: (wave: { radius: number; rag: number; time: number } | null) => void;
  mandala: (glow: number) => void; // 0..1: how lit-up the mandala is
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

// a soft round glow, drawn once and stamped for every particle
function sprite(c: number[]) {
  const s = document.createElement("canvas");
  s.width = s.height = 64;
  const g = s.getContext("2d");
  if (g) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(HOT, 1));
    gr.addColorStop(0.25, rgba(c, 0.85));
    gr.addColorStop(0.6, rgba(c, 0.25));
    gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  return s;
}

export function createGoldenReveal(canvas: HTMLCanvasElement, width: number, height: number, gsap: Gsap): GoldenReveal | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let w = width, h = height;
  const small = Math.min(w, h) < 600;
  const pr = Math.min(small ? 1 : 1.25, window.devicePixelRatio || 1);
  const far = () => Math.hypot(w, h) / 2; // centre to the corners
  const S = () => far() / 900; // sizes are tuned for a laptop screen
  const sprites = [sprite(GOLD), sprite(AMBER), sprite(ORANGE)];

  // fixed randoms, so the scrubbed preview shows the same frame each time
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // the burst: particles flying out with drag, a slow drift up
  const BURST = small ? 160 : 420;
  const burst = Array.from({ length: BURST }, () => ({
    a: rand() * Math.PI * 2,
    speed: 260 + Math.pow(rand(), 1.6) * 1100,
    size: 5 + Math.pow(rand(), 2.5) * 16,
    life: 0.7 + rand() * 1.1,
    delay: rand() * 0.1,
    tilt: 0.75 + rand() * 0.5, // a little flattened, for depth
    tone: (rand() * 3) | 0,
  }));
  // the artwork dissolving: flakes spread over the screen, freed as the wave passes
  const FLAKES = small ? 260 : 700;
  let flakes: { x: number; y: number; out: number; dx: number; dy: number; size: number; life: number; tone: number }[] = [];
  const placeFlakes = () => {
    seed = 99;
    flakes = Array.from({ length: FLAKES }, () => ({
      x: (rand() - 0.5) * w,
      y: (rand() - 0.5) * h,
      out: 40 + rand() * 160,
      dx: (rand() - 0.5) * 90,
      dy: (rand() - 0.5) * 90 - 30,
      size: 3 + Math.pow(rand(), 2.5) * 8,
      life: 0.55 + rand() * 0.7,
      tone: (rand() * 3) | 0,
    }));
  };
  // curved energy trails spiralling out
  let trails: { pts: [number, number][] }[] = [];
  const buildTrails = () => {
    seed = 41;
    const N = small ? 5 : 8, R = far() * 0.95;
    trails = Array.from({ length: N }, (_, i) => {
      const a0 = (i / N) * Math.PI * 2 + rand() * 0.4;
      const turn = (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.9);
      const reach = R * (0.55 + rand() * 0.45);
      const pts: [number, number][] = [];
      for (let k = 0; k <= 40; k++) {
        const f = k / 40, r = reach * Math.pow(f, 0.85), a = a0 + turn * f * f;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return { pts };
    });
  };

  const resize = (W: number, H: number) => {
    w = W;
    h = H;
    canvas.width = Math.round(w * pr);
    canvas.height = Math.round(h * pr);
    placeFlakes();
    buildTrails();
  };
  resize(w, h);

  let tl: Timeline | null = null;
  let raf = 0, alive = true;
  // what the timeline animates
  const st = { spark: 0, light: 0, rings: 0, ringsA: 0, shock: 0, shockA: 0, trails: 0, mandala: 0, wave: 0, waveA: 0, fade: 1 };

  const draw = (t: number) => {
    const s = S(), cx = w / 2, cy = h / 2;
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    // the spark and its warm glow
    const g = Math.max(st.spark, st.light) * st.fade;
    if (g > 0.01) {
      const R = (60 + 320 * st.spark + 420 * st.light) * s;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, rgba(HOT, 0.95 * g));
      gr.addColorStop(0.12, rgba(AMBER, 0.75 * g));
      gr.addColorStop(0.4, rgba(ORANGE, 0.25 * g));
      gr.addColorStop(1, rgba(ORANGE, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }

    // the shockwave: a soft ring racing out
    if (st.shockA > 0.01) {
      const r = st.shock * far() * 1.05, band = 46 * s;
      const gr = ctx.createRadialGradient(cx, cy, Math.max(0, r - band), cx, cy, r + band);
      gr.addColorStop(0, rgba(ORANGE, 0));
      gr.addColorStop(0.5, rgba(AMBER, 0.32 * st.shockA * st.fade));
      gr.addColorStop(1, rgba(ORANGE, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx, cy, r + band, 0, Math.PI * 2);
      ctx.arc(cx, cy, Math.max(0, r - band), 0, Math.PI * 2, true);
      ctx.fill();
    }

    // two energy rings, tilted ellipses (a touch of depth)
    if (st.ringsA > 0.01) {
      for (const [k, tilt, rot] of [
        [0.62, 0.55, 0.3],
        [0.95, 0.7, -0.5],
      ]) {
        const r = st.rings * far() * k;
        if (r < 2) continue;
        ctx.strokeStyle = rgba(AMBER, 0.85 * st.ringsA * st.fade);
        ctx.lineWidth = 2.2 * s;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * tilt, rot, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // the trails: a bright head with a fading tail, drawn along each curve
    if (st.trails > 0 && st.trails < 1.4) {
      const head = st.trails * 1.42, fade = (1 - Math.max(0, st.trails - 0.7) / 0.3) * st.fade;
      ctx.lineCap = "round";
      for (const tr of trails) {
        const n = tr.pts.length - 1;
        for (let k = 1; k <= n; k++) {
          const x = k / n;
          if (x > head) break;
          const a = (Math.max(0, 1 - (head - x) / 0.42) * 0.5 + Math.exp(-(head - x) * 22) * 0.9) * fade;
          if (a < 0.02) continue;
          ctx.strokeStyle = rgba(AMBER, a);
          ctx.lineWidth = (1.4 + 2.2 * Math.exp(-(head - x) * 22)) * s;
          ctx.beginPath();
          ctx.moveTo(cx + tr.pts[k - 1][0], cy + tr.pts[k - 1][1]);
          ctx.lineTo(cx + tr.pts[k][0], cy + tr.pts[k][1]);
          ctx.stroke();
        }
      }
    }

    // the burst's particles
    const tb = t - SPARK_END;
    if (tb > 0) {
      for (const p of burst) {
        const tt = tb - p.delay;
        if (tt <= 0) continue;
        const l = Math.min(1, tt / p.life);
        const a = Math.pow(1 - l, 1.6) * Math.min(1, tt / 0.04) * st.fade;
        if (a < 0.02) continue;
        const kd = 2.6, dist = (p.speed * s * (1 - Math.exp(-kd * tt))) / kd;
        const x = cx + Math.cos(p.a) * dist, y = cy + Math.sin(p.a) * dist * p.tilt - 24 * s * tt * tt;
        const size = p.size * s * (1 - 0.4 * l);
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[p.tone], x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
    }

    // the reveal wave: its ragged golden edge, and the artwork's flakes
    const waveEnd = far() + WAVE_RAG * s * 2 + 30 * s;
    const waveR = st.wave * waveEnd, waveSpeed = waveEnd / (REVEAL_END - REVEAL_START);
    if (st.waveA > 0.01 && waveR > 1) {
      ctx.beginPath();
      const N = 96;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2, r = waveR + WAVE_RAG * s * waveEdge(a, t);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(GOLD, 0.35 * st.waveA * st.fade);
      ctx.lineWidth = 14 * s;
      ctx.stroke();
      ctx.strokeStyle = rgba(HOT, 0.9 * st.waveA * st.fade);
      ctx.lineWidth = 2.2 * s;
      ctx.stroke();
    }
    if (st.wave > 0) {
      for (const f of flakes) {
        const dist = Math.hypot(f.x, f.y) || 1;
        const edge = waveR + WAVE_RAG * s * waveEdge(Math.atan2(f.y, f.x), t);
        const age = (edge - dist) / waveSpeed + Math.max(0, t - REVEAL_END);
        if (age <= 0) continue;
        const l = Math.min(1, age / f.life);
        const a = (1 - l) * (1 - l) * Math.min(1, age / 0.04) * st.fade;
        if (a < 0.02) continue;
        const k = (1 - Math.exp(-1.8 * age)) / 1.8;
        const x = cx + f.x + ((f.x / dist) * f.out + f.dx) * s * k, y = cy + f.y + ((f.y / dist) * f.out + f.dy) * s * k;
        const size = f.size * s;
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[f.tone], x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
    }
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
        hooks.cut({ radius: st.wave * (far() + WAVE_RAG * S() * 2 + 30 * S()), rag: WAVE_RAG * S(), time: t });
      } else hooks.cut(null);
      if (t > 0) hooks.mandala(st.mandala);
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
      // 1. the spark
      .to(st, { spark: 1, light: 0.35, duration: SPARK_END, ease: "power2.out" }, 0)
      // 2. the burst
      .to(st, { light: 1, duration: 0.12, ease: "power2.out" }, SPARK_END)
      .to(st, { spark: 0.25, duration: 0.5, ease: "power2.out" }, SPARK_END)
      .fromTo(st, { ringsA: 1 }, { ringsA: 0, duration: 1.0, ease: "power1.in", immediateRender: false }, SPARK_END)
      .to(st, { rings: 1, duration: 1.0, ease: "power2.out" }, SPARK_END)
      .to(st, { trails: 1.4, duration: 1.1, ease: "power1.inOut" }, SPARK_END)
      .to(st, { shock: 1, duration: 0.75, ease: "power2.out" }, SPARK_END + 0.04)
      .fromTo(st, { shockA: 1 }, { shockA: 0, duration: 0.75, ease: "power1.in", immediateRender: false }, SPARK_END + 0.04)
      .to(st, { mandala: 1, duration: 0.25, ease: "power2.out" }, SPARK_END)
      // 3. the reveal
      .to(st, { waveA: 1, duration: 0.15 }, REVEAL_START)
      .to(st, { wave: 1, duration: REVEAL_END - REVEAL_START, ease: "power2.inOut" }, REVEAL_START)
      .to(st, { mandala: 0, duration: REVEAL_END - REVEAL_START, ease: "power1.in" }, REVEAL_START + 0.25)
      .to(st, { light: 0, spark: 0, duration: 0.6, ease: "power1.out" }, REVEAL_START + 0.15)
      // 4. fade out what's left
      .to(st, { fade: 0, duration: END - REVEAL_END, ease: "power1.in" }, REVEAL_END);
    // development only: lets a test jump to any moment
    if (process.env.NODE_ENV !== "production") (window as unknown as { __goldenTl?: unknown }).__goldenTl = tl;
    raf = requestAnimationFrame(frame);
    return tl;
  };

  return { play, resize, dispose };
}
