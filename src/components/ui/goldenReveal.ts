// The golden ending, drawn with three.js on one transparent canvas over the
// loader (the artwork and the site stay HTML/CSS).
//
// Before the touch: a small 3D golden energy orb sits at the centre of the
// mandala from the first frame - a noise-lit core, a translucent Fresnel
// shell, 3 orbital rings with sparks running along them, orbiting motes, a
// soft glow and (as it charges) thin electrical arcs. MughalFrame sets its
// charge (0..1) as the characters approach; it grows and quickens with it.
//
// At the touch (the timeline, seconds from the contact):
//   0.00-0.08  the rings and shell contract, the core peaks
//   0.08       the orb releases it: particles burst outwards, a shockwave and
//              2 energy rings expand, energy trails, a brief golden flash,
//              the mandala fully lit
//   0.36       the website reveal: a ragged golden wave opens the site
//              (MughalFrame cuts the loader along the same edge), the
//              artwork dissolving into golden flakes along it, the
//              characters and mandala fading
//   ...END     what's left fades; then every GPU resource is released and
//              the render loop stops
//
// Coordinates: an orthographic camera in CSS pixels, origin at the screen
// centre (where the fingertips meet), y up.
//
// Performance: one renderer and context, no antialiasing, no post-processing
// (glow is drawn in the shaders), pixel ratio capped (1.5 desktop, 1 phone),
// low-poly geometry, one preallocated particle buffer, a handful of draw
// calls, and nothing rendered once it's over.

import type * as THREE_NS from "three";

type Kit = { THREE: typeof THREE_NS };

// three.js, loaded on demand after the page has rendered
export async function loadThree(): Promise<Kit> {
  return { THREE: await import("three") };
}

// the reveal wave's ragged edge (px on a laptop screen) and its shape at
// angle a, time t: -1..1. The shader uses the same formula, so the loader's
// cut (a clip-path in MughalFrame) and the drawn outline line up.
export const WAVE_RAG = 16;
export const waveEdge = (a: number, t: number) =>
  0.55 * Math.sin(7 * a + 2.1 * t) + 0.3 * Math.sin(13 * a - 2.9 * t + 1.7) + 0.15 * Math.sin(23 * a + 4.3 * t + 0.6);

// the timeline (s from the contact)
const CONTRACT = 0.08; // the orb gathers itself
const REVEAL_START = 0.36; // the site starts to show - exactly 360 ms after the touch
const REVEAL_LEN = 1.25;
const REVEAL_END = REVEAL_START + REVEAL_LEN;
const END = REVEAL_END + 0.45;
export const GOLDEN_DURATION = END;
export const GOLDEN_REVEAL_AT = REVEAL_START;

// palette (sRGB, used as-is by the shaders)
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const DEEP = hex("#9C5A12");
const GOLD = hex("#D9A23A");
const AMBER = hex("#F2B544");
const ORANGE = hex("#E8892B");
const HOT = hex("#FFD98A"); // the brightest it gets - warm, never white

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.07 + 13.1; a *= 0.5; }
  return v;
}`;

const GLSL_EDGE = /* glsl */ `
float waveEdge(float a, float t) {
  return 0.55 * sin(7.0 * a + 2.1 * t) + 0.3 * sin(13.0 * a - 2.9 * t + 1.7) + 0.15 * sin(23.0 * a + 4.3 * t + 0.6);
}`;

export type Hooks = {
  // the reveal wave each frame (radius and raggedness in px, time), for the
  // loader's cut; null before the reveal
  cut: (wave: { radius: number; rag: number; time: number } | null) => void;
  mandala: (glow: number) => void; // 0..1: the explosion lighting the mandala
  fade: (k: number) => void; // 0..1: the characters and mandala fading out
  onReveal: () => void; // the reveal starts (contact + 0.36 s)
  onDone: () => void; // over; GPU resources released
};

type Timeline = ReturnType<typeof import("gsap").gsap.timeline>;

export type GoldenReveal = {
  setCharge: (k: number) => void; // before the touch: 0 far apart .. 1 touching
  // at the touch; `scrub`: the timeline starts paused and nothing is torn down
  // at the end, so it can be moved to any moment (the loader preview)
  play: (hooks: Hooks, opts?: { scrub?: boolean }) => Timeline;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createGoldenReveal(kit: Kit, canvas: HTMLCanvasElement, width: number, height: number, gsap: typeof import("gsap").gsap): GoldenReveal | null {
  const { THREE } = kit;
  let renderer: THREE_NS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  let w = width, h = height;
  const mobile = Math.min(w, h) < 600;
  const pr = Math.min(mobile ? 1 : 1.5, window.devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  const far = () => Math.hypot(w, h) / 2; // centre to the corners
  const S = () => far() / 900; // explosion sizes: tuned for a laptop screen
  // the orb's size follows the mandala (51% of the shorter side): about 40 px
  // across at the start and ~115 px at the touch on a 1536-wide screen
  const U = () => (Math.min(w, h) * 0.512) / 442;
  const orbR0 = () => 20 * U(), orbR1 = () => 58 * U();

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -5000, 5000);
  camera.position.z = 1000;

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const v3 = (c: [number, number, number]) => new THREE.Vector3(...c);

  // ---------------------------------------------------------------- the orb
  const orb = new THREE.Group();
  scene.add(orb);

  // A. the core: a sphere lit from inside - bright gold at its heart, amber
  // to dark gold at the rim, with energy flowing through it
  const coreMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBright: { value: 0.5 }, uFlow: { value: 1 }, uDeep: { value: v3(DEEP) }, uAmber: { value: v3(AMBER) }, uHot: { value: v3(HOT) }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vP;
        void main() { vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uBright, uFlow, uAlpha; uniform vec3 uDeep, uAmber, uHot;
        varying vec3 vN; varying vec3 vP;
        ${NOISE}
        void main() {
          float nz = clamp(vN.z, 0.0, 1.0);
          vec2 uv = vec2(atan(vP.z, vP.x) * 1.3, vP.y * 2.2);
          float f = fbm(uv * 1.6 + vec2(uTime * 0.45 * uFlow, -uTime * 0.3 * uFlow));
          float f2 = fbm(uv * 3.1 - vec2(uTime * 0.7 * uFlow, uTime * 0.2));
          float t = pow(nz, 1.3);
          vec3 c = mix(uDeep, uAmber, smoothstep(0.0, 0.7, t));
          c = mix(c, uHot, pow(t, 3.0) * (0.45 + 0.55 * uBright) * (0.75 + 0.5 * f));
          c += uAmber * smoothstep(0.55, 0.85, f2) * 0.28 * (0.5 + uBright);   // flowing streaks
          // a soft, translucent rim (energy, not a solid ball)
          float a = uAlpha * smoothstep(0.0, 0.55, nz) * (0.7 + 0.3 * f);
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
    }),
  );
  const core = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 28, 20)), coreMat);
  orb.add(core);

  // B. the shell: translucent energy, bright at its edges (Fresnel), noise
  // drifting over it and its surface gently wobbling
  const shellMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPower: { value: 0.5 }, uAmber: { value: v3(AMBER) }, uOrange: { value: v3(ORANGE) }, uHot: { value: v3(HOT) }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime; varying vec3 vN; varying vec3 vP;
        void main() {
          vec3 p = position;
          p += normal * 0.045 * (sin(position.x * 5.0 + uTime * 2.1) + sin(position.y * 6.0 - uTime * 1.7) + sin(position.z * 4.0 + uTime * 2.6));
          vN = normalize(normalMatrix * normal); vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uPower, uAlpha; uniform vec3 uAmber, uOrange, uHot;
        varying vec3 vN; varying vec3 vP;
        ${NOISE}
        void main() {
          float fres = pow(1.0 - abs(vN.z), 2.4);
          vec2 uv = vec2(atan(vP.z, vP.x) * 1.5, vP.y * 2.5);
          float n = fbm(uv * 1.4 + vec2(uTime * 0.35, uTime * 0.22));
          float bands = smoothstep(0.5, 0.8, n);
          float a = (fres * (0.45 + 0.55 * n) * 0.9 + bands * 0.12) * (0.55 + 0.45 * uPower) * uAlpha;
          vec3 c = mix(uOrange, mix(uAmber, uHot, fres), 0.5 + 0.5 * fres);
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const shell = new THREE.Mesh(keep(new THREE.SphereGeometry(1.38, 28, 20)), shellMat);
  orb.add(shell);

  // E. the outer glow: a soft golden-orange halo (a camera-facing quad)
  const glowMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0.5 }, uOrange: { value: v3(ORANGE) }, uAmber: { value: v3(AMBER) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uI; uniform vec3 uOrange, uAmber;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float g = exp(-d * 3.2) * 0.85 + exp(-d * 1.5) * 0.3;
          float a = g * uI * smoothstep(1.0, 0.75, d);
          gl_FragColor = vec4(mix(uOrange, uAmber, exp(-d * 4.0)) * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), glowMat);
  glow.position.z = -3; // behind the sphere
  orb.add(glow);

  // C. the orbital rings: thin ellipses (circles tilted in 3D), each turning
  // at its own speed and direction
  const ringGeo = (r: number) => {
    const p: number[] = [], u: number[] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      p.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      u.push(i / 120);
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("aU", new THREE.Float32BufferAttribute(u, 1));
    return g;
  };
  // each ring is a band of light flowing round: a bright head and a long
  // fading tail (so it reads as moving energy, not a solid ring)
  const ringMat = () =>
    keep(
      new THREE.ShaderMaterial({
        uniforms: { uHead: { value: 0 }, uA: { value: 0.5 }, uC: { value: v3(AMBER) }, uHot: { value: v3(HOT) } },
        vertexShader: `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying float vU; uniform float uHead, uA; uniform vec3 uC, uHot;
          void main() {
            float tail = fract(uHead - vU);           // 0 at the head, growing behind it
            float k = pow(1.0 - tail, 2.6);
            float a = (0.08 + 0.92 * k) * uA;
            gl_FragColor = vec4(mix(uC, uHot, k * k) * a, a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  const RINGS = [
    { r: 1.75, tilt: [1.15, 0.25], spin: 0.9 },
    { r: 2.0, tilt: [1.3, -0.55], spin: -0.65 },
    { r: 2.25, tilt: [0.95, 0.9], spin: 0.5 },
  ];
  const rings = RINGS.map((cfg) => {
    const geo = ringGeo(cfg.r);
    const mat = ringMat();
    const pivot = new THREE.Group(); // the ring's tilt
    pivot.rotation.set(cfg.tilt[0], cfg.tilt[1], 0);
    const spinner = new THREE.Group(); // its turning
    spinner.add(new THREE.LineLoop(geo, mat));
    pivot.add(spinner);
    orb.add(pivot);
    return { cfg, mat, pivot, spinner, angle: Math.random() * 6 };
  });

  // thin electrical arcs: a few jagged lines round the shell, redrawn every
  // so often (one preallocated buffer)
  const ARCS = mobile ? 3 : 5, ARC_SEG = mobile ? 4 : 6;
  const arcPos = new Float32Array(ARCS * ARC_SEG * 2 * 3);
  const arcGeo = keep(new THREE.BufferGeometry());
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  const arcMat = keep(new THREE.LineBasicMaterial({ color: new THREE.Color(...HOT), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const arcs = new THREE.LineSegments(arcGeo, arcMat);
  arcs.frustumCulled = false;
  orb.add(arcs);
  let arcsAt = 0;
  const redrawArcs = () => {
    let k = 0;
    for (let i = 0; i < ARCS; i++) {
      const a0 = Math.random() * Math.PI * 2, el = (Math.random() - 0.5) * 1.2;
      let prev: number[] | null = null;
      for (let s = 0; s <= ARC_SEG; s++) {
        const a = a0 + s * 0.09, r = 1.15 + Math.random() * 0.3, e = el + (Math.random() - 0.5) * 0.3;
        const p = [Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r];
        if (prev) {
          arcPos.set(prev, k);
          arcPos.set(p, k + 3);
          k += 6;
        }
        prev = p;
      }
    }
    arcGeo.attributes.position.needsUpdate = true;
  };
  redrawArcs();

  // ------------------------------------------------- D. the particles (one Points)
  // orbiting motes, sparks running along the rings, the explosion's burst
  // and the artwork's dissolve - all in one preallocated buffer, moved on
  // the CPU (a few hundred points)
  const MOTES = mobile ? 10 : 16, SPARKS = mobile ? 3 : 6, BURST = mobile ? 40 : 130, DISSOLVE = mobile ? 120 : 700;
  const N = MOTES + SPARKS + BURST + DISSOLVE;
  const pPos = new Float32Array(N * 3), pSize = new Float32Array(N), pAlpha = new Float32Array(N), pTone = new Float32Array(N);
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(pAlpha, 1));
  pGeo.setAttribute("aTone", new THREE.BufferAttribute(pTone, 1));
  const pMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uPR: { value: pr }, uDeep: { value: v3(GOLD) }, uAmber: { value: v3(AMBER) }, uHot: { value: v3(HOT) } },
      vertexShader: /* glsl */ `
        attribute float aSize, aAlpha, aTone; uniform float uPR;
        varying float vA; varying float vT;
        void main() { vA = aAlpha; vT = aTone; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPR; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uDeep, uAmber, uHot; varying float vA; varying float vT;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = exp(-d * d * 3.2) * vA;
          vec3 c = mix(mix(uDeep, uAmber, smoothstep(0.0, 0.6, vT)), uHot, smoothstep(0.75, 1.0, vT) * 0.6);
          c += uHot * exp(-d * d * 16.0) * 0.35;
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);
  // fixed per-particle randoms
  const rnd = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  for (let i = 0; i < N; i++) pTone[i] = rnd[i][3];
  let dissolveBase: Float32Array = new Float32Array(DISSOLVE * 2);
  const placeDissolve = () => {
    dissolveBase = new Float32Array(DISSOLVE * 2);
    for (let i = 0; i < DISSOLVE; i++) {
      const r = rnd[MOTES + SPARKS + BURST + i];
      dissolveBase[i * 2] = (r[0] - 0.5) * w;
      dissolveBase[i * 2 + 1] = (r[1] - 0.5) * h;
    }
  };

  // ------------------------------------- the explosion's energy trails
  const trailMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uHead: { value: 0 }, uFade: { value: 1 }, uGold: { value: v3(GOLD) }, uAmber: { value: v3(AMBER) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uHead, uFade; uniform vec3 uGold, uAmber;
        void main() {
          float x = vUv.x;
          float on = smoothstep(uHead - 0.42, uHead, x) * step(x, uHead);
          float head = exp(-(uHead - x) * 22.0) * step(x, uHead);
          float a = (on * 0.5 + head * 0.9) * uFade;
          gl_FragColor = vec4(mix(uGold, uAmber, head) * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const trails = new THREE.Group();
  trails.visible = false;
  scene.add(trails);
  const buildTrails = () => {
    trails.children.slice().forEach((c) => {
      trails.remove(c);
      (c as THREE_NS.Mesh).geometry.dispose();
    });
    if (mobile) return;
    const s = S(), R = far() * 0.9;
    for (let i = 0; i < 7; i++) {
      const a0 = (i / 7) * Math.PI * 2 + rnd[i][0] * 0.5;
      const turn = (rnd[i][1] < 0.5 ? -1 : 1) * (0.7 + rnd[i][2] * 0.8);
      const reach = R * (0.55 + rnd[i][3] * 0.4);
      const pts: THREE_NS.Vector3[] = [];
      for (let k = 0; k <= 6; k++) {
        const f = k / 6, r = reach * Math.pow(f, 0.85), a = a0 + turn * f * f;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      trails.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 1.4 * s, 4, false), trailMat));
    }
  };

  // ---------- the shockwave, energy rings, flash and reveal outline: one
  // full-screen quad (screen space), drawn only after the touch
  const waveMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0 },
        uShock: { value: 0 },
        uShockA: { value: 0 },
        uRings: { value: 0 },
        uRingsA: { value: 0 },
        uFlash: { value: 0 },
        uWave: { value: 0 },
        uRag: { value: WAVE_RAG },
        uWaveA: { value: 0 },
        uScale: { value: 1 },
        uGold: { value: v3(GOLD) },
        uAmber: { value: v3(AMBER) },
        uOrange: { value: v3(ORANGE) },
        uHot: { value: v3(HOT) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec2 uRes; uniform float uTime, uShock, uShockA, uRings, uRingsA, uFlash, uWave, uRag, uWaveA, uScale;
        uniform vec3 uGold, uAmber, uOrange, uHot;
        ${GLSL_EDGE}
        void main() {
          vec2 p = (vUv - 0.5) * uRes; p.y = -p.y; // CSS px from the centre, y down
          float d = length(p), a = atan(p.y, p.x);
          vec3 c = vec3(0.0); float al = 0.0;
          // the shockwave: a soft ring whose radius wavers (animated distortion)
          if (uShockA > 0.0) {
            float r = uShock * (1.0 + 0.035 * sin(a * 9.0 + uTime * 6.0) + 0.02 * sin(a * 17.0 - uTime * 9.0));
            float x = (d - r) / (44.0 * uScale);
            float ring = exp(-x * x * 2.2) * (0.55 + 0.45 * smoothstep(0.0, -1.5, x));
            c += mix(uOrange, uAmber, 0.5) * ring * 0.5 * uShockA; al += ring * 0.36 * uShockA;
          }
          // two thin energy rings racing out
          if (uRingsA > 0.0) {
            for (int i = 0; i < 2; i++) {
              float r = uRings * (i == 0 ? 0.62 : 0.95) * length(uRes) * 0.5;
              float x = (d - r) / (3.0 * uScale);
              float line = exp(-x * x);
              c += uAmber * line * 0.8 * uRingsA; al += line * 0.6 * uRingsA;
            }
          }
          // the brief golden-orange flash of the release
          if (uFlash > 0.0) {
            float f = exp(-d / (230.0 * uScale)) * uFlash;
            c += mix(uOrange, uHot, exp(-d / (70.0 * uScale))) * f * 0.95; al += f * 0.6;
          }
          // the reveal wave's edge: a thin bright gold line and a soft glow
          if (uWaveA > 0.0 && uWave > 0.0) {
            float hr = uWave + uRag * waveEdge(a, uTime);
            float x = d - hr;
            float line = exp(-x * x / (2.2 * uScale * uScale));
            float soft = exp(-max(x, 0.0) / (22.0 * uScale)) * step(0.0, x) * 0.35 + exp(-max(-x, 0.0) / (10.0 * uScale)) * step(x, 0.0) * 0.15;
            c += (uAmber * line + uGold * soft) * uWaveA; al += (line * 0.85 + soft * 0.5) * uWaveA;
          }
          al = clamp(al, 0.0, 1.0);
          gl_FragColor = vec4(c, al);
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const wave = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), waveMat);
  wave.frustumCulled = false;
  wave.renderOrder = 5;
  wave.visible = false;
  scene.add(wave);

  // ------------------------------------------------------------- state
  let charge = 0;
  let tl: Timeline | null = null;
  // what the timeline animates (all 0 = before the touch)
  const st = { contract: 0, boom: 0, flash: 0, burst: 0, shock: 0, shockA: 0, erings: 0, eringsA: 0, trails: 0, mandala: 0, wave: 0, waveA: 0, art: 0, fade: 1 };
  let hooks: Hooks | null = null;

  const resize = (W: number, H: number) => {
    w = W;
    h = H;
    renderer.setSize(w, h, false);
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    waveMat.uniforms.uRes.value.set(w, h);
    placeDissolve();
    buildTrails();
  };
  resize(w, h);

  // --------------------------------------------------------- every frame
  let raf = 0, alive = true, last = performance.now(), spin = 0;
  const v = new THREE.Vector3();
  const frame = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const T = now / 1000; // free-running, for the orb's own idle motion
    const t = tl ? tl.time() : 0; // the timeline: seconds since the touch
    const s = S(), k = charge;
    const ease = k * k * (3 - 2 * k);

    // the orb: size and liveliness follow the charge; at the touch it
    // contracts, then releases and is gone
    const contract = st.contract * (1 - st.boom);
    const R = (orbR0() + (orbR1() - orbR0()) * ease) * (1 + 0.05 * Math.sin(T * 3.2)) * (1 - 0.18 * contract) * (1 + 1.4 * st.boom);
    const orbA = 1 - st.boom;
    orb.visible = orbA > 0.01;
    orb.scale.setScalar(R);
    spin += dt * (0.25 + 0.7 * k + 2.5 * st.contract);
    coreMat.uniforms.uTime.value = T;
    coreMat.uniforms.uFlow.value = 1 + 2.2 * k;
    coreMat.uniforms.uBright.value = Math.min(1.25, 0.35 + 0.65 * k + 0.5 * st.contract);
    coreMat.uniforms.uAlpha.value = orbA;
    shellMat.uniforms.uTime.value = T * (1 + k);
    shellMat.uniforms.uPower.value = k;
    shellMat.uniforms.uAlpha.value = orbA;
    shell.rotation.set(spin * 0.6, spin, spin * 0.35);
    shell.scale.setScalar(1 - 0.22 * contract);
    glow.scale.setScalar(6 + 2 * k);
    glowMat.uniforms.uI.value = (0.5 + 0.6 * k + 0.5 * st.contract) * orbA;
    rings.forEach((r, i) => {
      r.angle += dt * r.cfg.spin * (1 + 1.6 * k);
      r.spinner.rotation.z = r.angle;
      r.pivot.scale.setScalar(1 - 0.65 * contract);
      r.mat.uniforms.uHead.value = (r.angle / (Math.PI * 2)) * (r.cfg.spin > 0 ? 1 : -1) * 1.7;
      r.mat.uniforms.uA.value = (0.45 + 0.2 * Math.sin(T * (1.3 + i * 0.4) + i) + 0.3 * k) * orbA;
    });
    const arcK = Math.min(1, Math.max(0, (k - 0.6) / 0.3));
    if (arcK > 0 && now - arcsAt > 75) {
      arcsAt = now;
      redrawArcs();
    }
    arcGeo.setDrawRange(0, Math.round(arcK * ARCS) * ARC_SEG * 2);
    arcMat.opacity = (0.35 + 0.4 * Math.random()) * arcK * orbA;
    orb.updateMatrixWorld(true);

    // the particles
    let i = 0;
    // orbiting motes, now and then drawn in towards the core
    for (let m = 0; m < MOTES; m++, i++) {
      const r = rnd[i];
      const a = T * (0.6 + r[0] * 1.2) * (r[1] < 0.5 ? -1 : 1) + r[2] * 6.28;
      const pull = 1 - (0.25 + 0.5 * k) * Math.max(0, Math.sin(T * (0.7 + r[3]) + r[0] * 6.28));
      const dist = R * (1.7 + r[3] * 1.6) * pull * (1 - 0.5 * contract);
      pPos[i * 3] = Math.cos(a) * dist;
      pPos[i * 3 + 1] = Math.sin(a) * dist * (0.45 + r[1] * 0.4);
      pPos[i * 3 + 2] = 5;
      pSize[i] = (2 + r[0] * 2.5) * U() * (1 + 0.5 * k);
      pAlpha[i] = (0.55 + 0.45 * Math.sin(T * 4 + r[2] * 9)) * orbA;
    }
    // sparks running along the rings
    for (let sp = 0; sp < SPARKS; sp++, i++) {
      const ring = rings[sp % rings.length], r = rnd[i];
      const a = (T * (1.5 + r[0]) + r[1] * 6.28) * (ring.cfg.spin > 0 ? 1 : -1);
      v.set(Math.cos(a) * ring.cfg.r, Math.sin(a) * ring.cfg.r, 0).applyMatrix4(ring.spinner.matrixWorld);
      pPos[i * 3] = v.x;
      pPos[i * 3 + 1] = v.y;
      pPos[i * 3 + 2] = 6;
      pSize[i] = (2.5 + r[2] * 2) * U();
      pAlpha[i] = (0.3 + 0.7 * k) * (Math.sin(T * 9 + r[3] * 20) > 0.2 ? 1 : 0.25) * orbA;
    }
    // the burst
    const tb = t - CONTRACT;
    for (let b = 0; b < BURST; b++, i++) {
      const r = rnd[i];
      if (tb <= 0 || st.burst <= 0) {
        pAlpha[i] = 0;
        continue;
      }
      const a = r[0] * Math.PI * 2, sp = (260 + Math.pow(r[1], 1.6) * 1100) * s, kd = 2.6;
      const life = 0.8 + r[2] * 1.1;
      const dist = (sp * (1 - Math.exp(-kd * tb))) / kd;
      pPos[i * 3] = Math.cos(a) * dist;
      pPos[i * 3 + 1] = Math.sin(a) * dist * (0.8 + r[3] * 0.4) + 24 * s * tb * tb;
      pPos[i * 3 + 2] = 4;
      const l = Math.min(1, tb / life);
      pSize[i] = (4 + Math.pow(r[3], 2.5) * 13) * s * (1 - 0.35 * l);
      pAlpha[i] = Math.pow(1 - l, 1.6) * Math.min(1, tb / 0.04) * st.fade;
    }
    // the artwork dissolving along the reveal wave
    const waveEnd = far() + WAVE_RAG * s * 2 + 30 * s;
    const waveR = st.wave * waveEnd, waveSpeed = waveEnd / REVEAL_LEN;
    for (let d = 0; d < DISSOLVE; d++, i++) {
      const r = rnd[i];
      const bx = dissolveBase[d * 2], by = dissolveBase[d * 2 + 1];
      const dist = Math.hypot(bx, by) || 1;
      const edge = waveR + WAVE_RAG * s * waveEdge(Math.atan2(-by, bx), t);
      const age = st.wave > 0 ? (edge - dist) / waveSpeed + Math.max(0, t - REVEAL_END) : -1;
      if (age <= 0) {
        pAlpha[i] = 0;
        continue;
      }
      const out = (40 + r[2] * 150) * s, kd = 1.8, f = (1 - Math.exp(-kd * age)) / kd;
      pPos[i * 3] = bx + ((bx / dist) * out + (r[0] - 0.5) * 80 * s) * f;
      pPos[i * 3 + 1] = by + ((by / dist) * out + (r[1] - 0.3) * 80 * s) * f;
      pPos[i * 3 + 2] = 3;
      const l = Math.min(1, age / (0.55 + r[3] * 0.6));
      pSize[i] = (1.8 + Math.pow(r[3], 2.5) * 5) * s;
      pAlpha[i] = (1 - l) * (1 - l) * Math.min(1, age / 0.04) * st.fade;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;

    // the explosion's trails, shockwave, rings, flash and the reveal wave
    trails.visible = st.trails > 0 && st.trails < 1.4;
    trailMat.uniforms.uHead.value = st.trails * 1.42;
    trailMat.uniforms.uFade.value = (1 - Math.max(0, st.trails - 0.7) / 0.3) * st.fade;
    wave.visible = t > 0;
    const wu = waveMat.uniforms;
    wu.uTime.value = t;
    wu.uScale.value = s;
    wu.uShock.value = st.shock * far() * 1.05;
    wu.uShockA.value = st.shockA * st.fade;
    wu.uRings.value = st.erings;
    wu.uRingsA.value = st.eringsA * st.fade;
    wu.uFlash.value = st.flash;
    wu.uWave.value = waveR;
    wu.uRag.value = WAVE_RAG * s;
    wu.uWaveA.value = st.waveA * st.fade;

    if (hooks && t > 0) {
      hooks.cut(t >= REVEAL_START ? { radius: waveR, rag: WAVE_RAG * s, time: t } : null);
      hooks.mandala(st.mandala);
    }
    if (hooks) hooks.fade(st.art);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const dispose = () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    tl?.kill();
    trails.children.forEach((c) => (c as THREE_NS.Mesh).geometry.dispose());
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const play = (h: Hooks, opts: { scrub?: boolean } = {}) => {
    hooks = h;
    let revealed = false;
    const reveal = () => {
      if (revealed) return; // once only
      revealed = true;
      h.onReveal();
    };
    tl = gsap.timeline({
      paused: !!opts.scrub,
      onComplete: () => {
        if (opts.scrub) return; // kept, so it can be moved back
        h.cut(null);
        dispose(); // stops the render loop and frees the GPU
        h.onDone();
      },
    });
    tl
      // 1. the orb gathers itself: rings and shell contract, the core peaks
      .to(st, { contract: 1, duration: CONTRACT, ease: "power2.in" }, 0)
      // 2. the release
      .to(st, { boom: 1, duration: 0.28, ease: "power2.out" }, CONTRACT)
      .to(st, { flash: 1, duration: 0.06, ease: "power2.out" }, CONTRACT)
      .to(st, { flash: 0, duration: 0.4, ease: "power1.out" }, CONTRACT + 0.06)
      .set(st, { burst: 1 }, CONTRACT)
      .to(st, { shock: 1, duration: 0.75, ease: "power2.out" }, CONTRACT)
      .fromTo(st, { shockA: 1 }, { shockA: 0, duration: 0.75, ease: "power1.in" }, CONTRACT)
      .to(st, { erings: 1, duration: 0.9, ease: "power2.out" }, CONTRACT)
      .fromTo(st, { eringsA: 1 }, { eringsA: 0, duration: 0.9, ease: "power1.in" }, CONTRACT)
      .to(st, { trails: 1.4, duration: 1.1, ease: "power1.inOut" }, CONTRACT)
      .to(st, { mandala: 1, duration: 0.12, ease: "power2.out" }, CONTRACT)
      // 3. the website reveal, exactly 0.36 s after the touch
      .call(reveal, [], REVEAL_START)
      .to(st, { waveA: 1, duration: 0.12 }, REVEAL_START)
      .to(st, { wave: 1, duration: REVEAL_LEN, ease: "power2.inOut" }, REVEAL_START)
      .to(st, { art: 1, duration: 0.9, ease: "power1.in" }, REVEAL_START + 0.1)
      .to(st, { mandala: 0, duration: 0.9, ease: "power1.in" }, REVEAL_START + 0.1)
      // 4. what's left fades
      .to(st, { fade: 0, duration: END - REVEAL_END, ease: "power1.in" }, REVEAL_END);
    // development only: lets a test jump to any moment
    if (process.env.NODE_ENV !== "production") (window as unknown as { __goldenTl?: unknown }).__goldenTl = tl;
    return tl;
  };

  return {
    setCharge: (k) => {
      charge = Math.min(1, Math.max(0, k));
    },
    play,
    resize,
    dispose,
  };
}
