// The loader's ending, drawn with three.js on a transparent canvas over the
// loader: when the two index fingertips touch, an antique-gold spark lights
// up, bursts into a 3D explosion of golden energy (particles, rings, trails,
// a shockwave), and an expanding golden wave unlocks the site - the loader's
// artwork dissolving into golden particles along it - before everything
// fades and every GPU resource is released.
//
// Timeline (seconds from the touch; one GSAP timeline drives everything and
// is also the clock the shaders read):
// (MughalFrame's orb has already built the energy up before the touch)
//   0.0-0.06 spark: the core flares, the point light comes on
//   0.06-0.6 explosion: particles, concentric rings, curved trails, shockwave;
//            the mandala lights up for a moment
//   0.6-1.3  the energy settles, the mandala still lit
//   1.3-2.5  reveal (3.5 s from the loader's start): the wave (a ragged golden outline) runs out to the
//            corners; inside it the loader is cut away (MughalFrame applies
//            the same edge as a clip-path) and turns into golden particles
//   2.5-3.0  everything left fades out; then dispose and stop
//
// Coordinates: the camera is placed so the z = 0 plane maps 1:1 to CSS
// pixels, origin at the screen centre, y up - so a screen point (px, py) is
// (px - w/2, h/2 - py, 0). The fingertips meet at the screen centre.

import type * as THREE_NS from "three";
import type { EffectComposer as EffectComposerT } from "three/addons/postprocessing/EffectComposer.js";

type Kit = {
  THREE: typeof THREE_NS;
  EffectComposer: typeof import("three/addons/postprocessing/EffectComposer.js").EffectComposer;
  RenderPass: typeof import("three/addons/postprocessing/RenderPass.js").RenderPass;
  UnrealBloomPass: typeof import("three/addons/postprocessing/UnrealBloomPass.js").UnrealBloomPass;
  OutputPass: typeof import("three/addons/postprocessing/OutputPass.js").OutputPass;
};

// three.js and its post-processing, loaded on demand (only the loader needs them)
export async function loadThree(): Promise<Kit> {
  const [THREE, ec, rp, ub, op] = await Promise.all([
    import("three"),
    import("three/addons/postprocessing/EffectComposer.js"),
    import("three/addons/postprocessing/RenderPass.js"),
    import("three/addons/postprocessing/UnrealBloomPass.js"),
    import("three/addons/postprocessing/OutputPass.js"),
  ]);
  return { THREE, EffectComposer: ec.EffectComposer, RenderPass: rp.RenderPass, UnrealBloomPass: ub.UnrealBloomPass, OutputPass: op.OutputPass };
}

// how ragged the reveal wave's edge is (px on a laptop screen), and its shape
// at angle a, time t (s): -1..1. The shader uses the same formula, so the
// loader's cut (MughalFrame's clip-path) and the drawn outline line up.
export const WAVE_RAG = 16;
export const waveEdge = (a: number, t: number) =>
  0.55 * Math.sin(7 * a + 2.1 * t) + 0.3 * Math.sin(13 * a - 2.9 * t + 1.7) + 0.15 * Math.sin(23 * a + 4.3 * t + 0.6);

// the timeline (s)
const SPARK_END = 0.06;
const REVEAL_START = 0.1; // the site starts to show 0.1 s after the explosion (1.9 s from the start)
const REVEAL_END = REVEAL_START + 1.2;
const END = REVEAL_END + 0.5;
export const GOLDEN_DURATION = END; // s, the touch to the end

// palette: deep antique gold, amber, warm orange (sRGB; three converts)
const GOLD = "#D9A23A";
const AMBER = "#F2B544";
const DEEP = "#B8741A";
const ORANGE = "#E8892B";

const GLSL_EDGE = /* glsl */ `
float waveEdge(float a, float t) {
  return 0.55 * sin(7.0 * a + 2.1 * t) + 0.3 * sin(13.0 * a - 2.9 * t + 1.7) + 0.15 * sin(23.0 * a + 4.3 * t + 0.6);
}`;

export type Hooks = {
  // the reveal's progress each frame: the wave's radius (px) and its edge
  // raggedness (px) at time t, for the loader's cut; null once it's gone
  cut: (wave: { radius: number; rag: number; time: number } | null) => void;
  // 0..1: how lit-up the mandala is
  mandala: (glow: number) => void;
  onReveal: () => void; // the wave starts (the site begins to show)
  onDone: () => void; // all over; GPU resources released
};

export type GoldenReveal = {
  // `scrub`: the timeline starts paused and is never torn down at the end,
  // so it can be moved to any moment (the loader preview); returns it
  play: (hooks: Hooks, opts?: { scrub?: boolean }) => ReturnType<typeof import("gsap").gsap.timeline>;
  // before the explosion: how grown the energy ball is (0 small .. 1 full)
  setCharge: (k: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createGoldenReveal(kit: Kit, canvas: HTMLCanvasElement, width: number, height: number, gsap: typeof import("gsap").gsap): GoldenReveal | null {
  const { THREE } = kit;
  let renderer: THREE_NS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  let w = width, h = height;
  const pr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  const far = () => Math.hypot(w, h) / 2; // centre to the corners
  const S = () => far() / 900; // sizes are tuned for a laptop screen

  // --- scene, and a camera that makes z = 0 pixel-exact
  const scene = new THREE.Scene();
  const FOV = 35;
  const camera = new THREE.PerspectiveCamera(FOV, w / h, 1, 20000);
  const camZ = () => h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
  const placeCamera = () => {
    camera.aspect = w / h;
    camera.position.set(0, 0, camZ());
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  placeCamera();

  // --- bloom. UnrealBloomPass writes alpha 1 everywhere from its blur, which
  // would make the whole canvas opaque; its blur is patched to carry the
  // real alpha, so the canvas stays see-through except where it glows.
  const composer: EffectComposerT = new kit.EffectComposer(renderer, new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType }));
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  composer.addPass(new kit.RenderPass(scene, camera, undefined, new THREE.Color(0x000000), 0));
  const bloom = new kit.UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.35, 0.18);
  for (const m of bloom.separableBlurMaterials) {
    m.fragmentShader = m.fragmentShader
      .replace("vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;", "vec4 diffuseSum = texture2D( colorTexture, vUv ) * weightSum;")
      .replace("vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;", "vec4 sample1 = texture2D( colorTexture, vUv + uvOffset );")
      .replace("vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;", "vec4 sample2 = texture2D( colorTexture, vUv - uvOffset );")
      .replace("gl_FragColor = vec4(diffuseSum/weightSum, 1.0);", "gl_FragColor = diffuseSum/weightSum;");
    m.needsUpdate = true;
  }
  composer.addPass(bloom);
  composer.addPass(new kit.OutputPass());

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const col = (c: string) => new THREE.Color(c);

  // --- 1. the spark: a small glowing core + a point light at the contact
  // point, and a soft amber light spilling round it (the light on the artwork)
  const light = new THREE.PointLight(col(AMBER), 0, 0, 1.2);
  light.position.set(0, 0, 90);
  scene.add(light);
  const glowMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col(AMBER) }, uCore: { value: col("#FFE7B0") }, uI: { value: 0 }, uHot: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform vec3 uColor; uniform vec3 uCore; uniform float uI; uniform float uHot;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          float halo = exp(-d * 4.0) * 0.6 + exp(-d * 1.6) * 0.18;
          float core = exp(-d * 40.0) * uHot;
          vec3 c = uColor * halo + uCore * core;
          float a = clamp((halo + core) * uI, 0.0, 1.0);
          gl_FragColor = vec4(c * uI, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const glowGeo = keep(new THREE.PlaneGeometry(1, 1));
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = 2;
  scene.add(glow);

  // --- 2a. the explosion's particles: one Points object, motion on the GPU
  const BURST = Math.round(Math.min(5000, 2200 + (w * h) / 900));
  const burstGeo = keep(new THREE.BufferGeometry());
  {
    const dir = new Float32Array(BURST * 3), sp = new Float32Array(BURST), sz = new Float32Array(BURST), dl = new Float32Array(BURST), lf = new Float32Array(BURST), tone = new Float32Array(BURST);
    for (let i = 0; i < BURST; i++) {
      // random direction, flattened a little towards the screen plane
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      dir[i * 3] = r * Math.cos(th);
      dir[i * 3 + 1] = r * Math.sin(th);
      dir[i * 3 + 2] = u * 0.7;
      sp[i] = 260 + Math.pow(Math.random(), 1.6) * 1250; // most slow, a few fast
      sz[i] = 2 + Math.pow(Math.random(), 3) * 9;
      dl[i] = Math.random() * 0.12;
      lf[i] = 0.7 + Math.random() * 1.1;
      tone[i] = Math.random();
    }
    burstGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BURST * 3), 3));
    burstGeo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    burstGeo.setAttribute("aSpeed", new THREE.BufferAttribute(sp, 1));
    burstGeo.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    burstGeo.setAttribute("aDelay", new THREE.BufferAttribute(dl, 1));
    burstGeo.setAttribute("aLife", new THREE.BufferAttribute(lf, 1));
    burstGeo.setAttribute("aTone", new THREE.BufferAttribute(tone, 1));
  }
  const pointUniforms = () => ({
    uTime: { value: 0 },
    uScale: { value: S() },
    uPR: { value: pr },
    uCamZ: { value: camZ() },
    uFade: { value: 1 },
    uGold: { value: col(GOLD) },
    uAmber: { value: col(AMBER) },
    uDeep: { value: col(DEEP) },
  });
  const burstMat = keep(
    new THREE.ShaderMaterial({
      uniforms: pointUniforms(),
      vertexShader: /* glsl */ `
        attribute vec3 aDir; attribute float aSpeed, aSize, aDelay, aLife, aTone;
        uniform float uTime, uScale, uPR, uCamZ;
        varying float vA; varying float vTone;
        void main(){
          float t = max(0.0, uTime - aDelay);
          // drag: fast out, easing off
          float k = 2.6;
          float dist = aSpeed * uScale * (1.0 - exp(-k * t)) / k;
          vec3 p = aDir * dist;
          // a gentle swirl and a slow drift upwards, like dust in warm air
          float sw = 0.35 * (1.0 - exp(-t * 1.5)) * (aTone - 0.5);
          p.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xy;
          p.y += 26.0 * uScale * t * t;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float life = clamp(t / aLife, 0.0, 1.0);
          vA = step(0.0001, uTime - aDelay) * pow(1.0 - life, 1.6) * smoothstep(0.0, 0.05, t);
          vTone = aTone;
          gl_PointSize = aSize * uScale * uPR * (uCamZ / -mv.z) * (1.0 - 0.4 * life);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold, uAmber, uDeep; uniform float uFade;
        varying float vA; varying float vTone;
        void main(){
          vec2 q = gl_PointCoord - 0.5;
          float d = length(q) * 2.0;
          float a = exp(-d * d * 3.5) * vA * uFade;
          vec3 c = mix(mix(uDeep, uGold, smoothstep(0.0, 0.6, vTone)), uAmber, smoothstep(0.6, 1.0, vTone));
          c += vec3(0.25, 0.18, 0.06) * exp(-d * d * 18.0); // a warm hot centre
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const burst = new THREE.Points(burstGeo, burstMat);
  burst.frustumCulled = false;
  burst.visible = false;
  scene.add(burst);

  // --- 2b. concentric energy rings: thin gold tori, tilted for depth, lit by
  // the point light
  const ringGeo = keep(new THREE.TorusGeometry(1, 0.006, 12, 220));
  const rings = [0, 1, 2].map((i) => {
    const mat = keep(
      new THREE.MeshStandardMaterial({
        color: col(GOLD),
        emissive: col(i === 1 ? ORANGE : AMBER),
        emissiveIntensity: 1.4,
        metalness: 0.85,
        roughness: 0.3,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const m = new THREE.Mesh(ringGeo, mat);
    m.rotation.set([0.42, -0.3, 0.18][i], [-0.25, 0.38, -0.12][i], i * 0.7);
    m.visible = false;
    scene.add(m);
    return { m, mat, delay: i * 0.09, reach: [0.62, 0.86, 1.08][i] };
  });

  // --- 2c. curved energy trails: spirals out from the contact point, drawn
  // along their length (head bright, tail fading)
  const trailMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uHead: { value: 0 }, uFade: { value: 1 }, uGold: { value: col(GOLD) }, uAmber: { value: col(AMBER) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uHead, uFade; uniform vec3 uGold, uAmber;
        void main(){
          float x = vUv.x;                    // 0 at the start, 1 at the end of the trail
          float tail = 0.42;
          float on = smoothstep(uHead - tail, uHead, x) * step(x, uHead);
          float head = exp(-(uHead - x) * 22.0) * step(x, uHead);
          float a = (on * 0.55 + head) * uFade;
          gl_FragColor = vec4(mix(uGold, uAmber, head) * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const trailGroup = new THREE.Group();
  trailGroup.visible = false;
  scene.add(trailGroup);
  const buildTrails = () => {
    trailGroup.children.slice().forEach((c) => {
      trailGroup.remove(c);
      (c as THREE_NS.Mesh).geometry.dispose();
    });
    const N = 11, s = S(), R = far() * 0.95;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2 + Math.random() * 0.4;
      const turn = (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.9);
      const reach = R * (0.55 + Math.random() * 0.45);
      const lift = (Math.random() - 0.5) * 260 * s;
      const pts: THREE_NS.Vector3[] = [];
      for (let k = 0; k <= 6; k++) {
        const f = k / 6;
        const r = reach * Math.pow(f, 0.85);
        const a = a0 + turn * f * f;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, lift * Math.sin(f * Math.PI)));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, (1.1 + Math.random() * 1.1) * s, 6, false);
      trailGroup.add(new THREE.Mesh(geo, trailMat));
    }
  };
  buildTrails();

  // --- 2d. the shockwave and 3. the reveal wave: one full-screen plane
  // (screen space) drawing a soft distorted shock ring, and the reveal's
  // thin golden outline along its ragged edge
  const waveMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0 },
        uShock: { value: 0 },
        uShockA: { value: 0 },
        uWave: { value: 0 },
        uRag: { value: WAVE_RAG },
        uWaveA: { value: 0 },
        uScale: { value: S() },
        uGold: { value: col(GOLD) },
        uAmber: { value: col(AMBER) },
        uOrange: { value: col(ORANGE) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec2 uRes; uniform float uTime, uShock, uShockA, uWave, uRag, uWaveA, uScale;
        uniform vec3 uGold, uAmber, uOrange;
        ${GLSL_EDGE}
        void main(){
          vec2 p = (vUv - 0.5) * uRes; p.y = -p.y; // CSS px from the centre, y down
          float d = length(p), a = atan(p.y, p.x);
          vec3 c = vec3(0.0); float al = 0.0;
          // the shockwave: a soft ring whose radius wavers with the angle
          if (uShockA > 0.0) {
            float r = uShock * (1.0 + 0.035 * sin(a * 9.0 + uTime * 6.0) + 0.02 * sin(a * 17.0 - uTime * 9.0));
            float x = (d - r) / (46.0 * uScale);
            float ring = exp(-x * x * 2.2) * (0.55 + 0.45 * smoothstep(0.0, -1.5, x));
            c += mix(uOrange, uAmber, 0.5) * ring * 0.55 * uShockA;
            al += ring * 0.4 * uShockA;
          }
          // the reveal wave's edge: a thin bright gold line and a soft glow
          if (uWaveA > 0.0 && uWave > 0.0) {
            float hr = uWave + uRag * waveEdge(a, uTime);
            float x = d - hr;
            float line = exp(-x * x / (2.2 * uScale * uScale));
            float soft = exp(-max(x, 0.0) / (22.0 * uScale)) * step(0.0, x) * 0.35 + exp(-max(-x, 0.0) / (10.0 * uScale)) * step(x, 0.0) * 0.18;
            c += (uAmber * line * 1.1 + uGold * soft) * uWaveA;
            al += (line * 0.9 + soft * 0.5) * uWaveA;
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
  const waveGeo = keep(new THREE.PlaneGeometry(1, 1));
  const wave = new THREE.Mesh(waveGeo, waveMat);
  wave.frustumCulled = false;
  wave.renderOrder = 5;
  scene.add(wave);

  // --- 3b. the artwork dissolving: particles spread over the whole screen,
  // each set free as the wave passes it, then drifting off in 3D (towards
  // the camera and out, turning as they go) and fading
  let dissolveGeo = keep(new THREE.BufferGeometry());
  const buildDissolve = () => {
    const N = Math.round(Math.min(14000, (w * h) / 130));
    const base = new Float32Array(N * 3), vel = new Float32Array(N * 3), sz = new Float32Array(N), spin = new Float32Array(N), tone = new Float32Array(N), life = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * w, y = (Math.random() - 0.5) * h;
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      const d = Math.hypot(x, y) || 1, out = 40 + Math.random() * 160;
      vel[i * 3] = (x / d) * out + (Math.random() - 0.5) * 90;
      vel[i * 3 + 1] = (y / d) * out + (Math.random() - 0.5) * 90 + 30;
      vel[i * 3 + 2] = 60 + Math.random() * 420; // up off the page, towards the camera
      sz[i] = 1.6 + Math.pow(Math.random(), 2.5) * 5.5;
      spin[i] = (Math.random() - 0.5) * 12;
      tone[i] = Math.random();
      life[i] = 0.55 + Math.random() * 0.7;
    }
    dissolveGeo.dispose();
    dissolveGeo = new THREE.BufferGeometry();
    dissolveGeo.setAttribute("position", new THREE.BufferAttribute(base, 3));
    dissolveGeo.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
    dissolveGeo.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    dissolveGeo.setAttribute("aSpin", new THREE.BufferAttribute(spin, 1));
    dissolveGeo.setAttribute("aTone", new THREE.BufferAttribute(tone, 1));
    dissolveGeo.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
    if (dissolve) dissolve.geometry = dissolveGeo;
  };
  const dissolveMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { ...pointUniforms(), uWave: { value: 0 }, uRag: { value: WAVE_RAG }, uWaveSpeed: { value: 1 }, uTail: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec3 aVel; attribute float aSize, aSpin, aTone, aLife;
        uniform float uTime, uScale, uPR, uCamZ, uWave, uRag, uWaveSpeed, uTail;
        varying float vA; varying float vTone; varying float vAng;
        ${GLSL_EDGE}
        void main(){
          vec2 b = position.xy;
          float a = atan(-b.y, b.x);
          float edge = uWave + uRag * waveEdge(a, uTime);
          // how long ago the wave passed this spot (s)
          float age = (edge - length(b)) / uWaveSpeed + uTail;
          float on = step(0.0, age);
          age = max(age, 0.0);
          // slowing as they drift (air drag)
          float k = 1.8;
          vec3 p = vec3(b, 0.0) + aVel * uScale * (1.0 - exp(-k * age)) / k;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float l = clamp(age / aLife, 0.0, 1.0);
          vA = on * (1.0 - l) * (1.0 - l) * smoothstep(0.0, 0.04, age);
          vTone = aTone;
          vAng = aSpin * age;
          gl_PointSize = aSize * uScale * uPR * (uCamZ / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold, uAmber, uDeep; uniform float uFade;
        varying float vA; varying float vTone; varying float vAng;
        void main(){
          // a turning golden flake: a soft diamond, spun by its own angle
          vec2 q = gl_PointCoord - 0.5;
          q = mat2(cos(vAng), -sin(vAng), sin(vAng), cos(vAng)) * q;
          float d = abs(q.x) * 1.6 + abs(q.y) * 2.4;
          float a = smoothstep(1.0, 0.35, d) * vA * uFade;
          vec3 c = mix(mix(uDeep, uGold, smoothstep(0.0, 0.55, vTone)), uAmber, smoothstep(0.55, 1.0, vTone));
          gl_FragColor = vec4(c * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  let dissolve: THREE_NS.Points | null = null;
  buildDissolve();
  dissolve = new THREE.Points(dissolveGeo, dissolveMat);
  dissolve.frustumCulled = false;
  dissolve.visible = false;
  scene.add(dissolve);

  // --- 0. the energy ball before the explosion: a small, bright, irregular
  // ball of light (its outline wobbling with noise, never a perfect sphere),
  // thin rays flickering out of it, sparkles and a warm glow - one quad
  const ballMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCharge: { value: 0 }, uA: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uTime, uCharge, uA;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;          // -1..1 across the quad; the ball's radius is ~0.25
          float r = length(p), a = atan(p.y, p.x);
          float t = uTime * (1.0 + uCharge);
          // a lumpy, shifting outline
          float lump = fbm(vec2(cos(a), sin(a)) * 1.6 + vec2(t * 0.9, -t * 0.7));
          float R = 0.3 * (0.7 + 0.65 * lump);
          float body = smoothstep(R * 1.25, R * 0.35, r);
          float core = exp(-r / (R * 0.45));
          // thin rays of light, flickering
          float rays = pow(noise(vec2(a * 7.0, t * 2.4)), 5.0) * 1.6 + pow(noise(vec2(a * 15.0 + 3.0, -t * 3.1)), 8.0) * 1.2;
          rays *= smoothstep(0.8, R, r) * (0.25 + 0.45 * uCharge);
          // the warm glow
          float glow = exp(-r * 2.4) * 0.6;
          // sparkles drifting in the glow
          vec2 g = p * 12.0 + vec2(t * 0.2, -t * 0.35);
          vec2 id = floor(g), f = fract(g) - 0.5;
          float h = hash(id);
          float spark = step(0.78, h) * smoothstep(0.16, 0.0, length(f + (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6))
                      * (0.5 + 0.5 * sin(t * 5.0 + h * 40.0)) * smoothstep(0.95, 0.3, r);
          float light = (body * (0.7 + 0.4 * fbm(p * 6.0 + t)) + core * 0.8 + rays * 1.3 + glow) * 0.85;
          // saturated golden yellow (rays and body), a small pale-yellow heart,
          // amber-orange at the fringe; sparkles orange
          vec3 c = mix(vec3(0.98, 0.6, 0.08), vec3(1.0, 0.86, 0.16), smoothstep(0.1, 0.8, light));
          c = mix(c, vec3(1.0, 0.95, 0.6), clamp(core * core * 0.9, 0.0, 1.0));
          float sp = spark * 0.85;
          c = (c * light + vec3(1.0, 0.58, 0.12) * sp) / max(light + sp, 0.001);
          // fade out well inside the quad (no square edge)
          float al = clamp(light + sp, 0.0, 1.0) * uA * smoothstep(1.0, 0.65, r);
          c = pow(c, vec3(2.2)); // to linear: the render pipeline converts back to sRGB
          gl_FragColor = vec4(c * al * 0.82, al); // a little under full, so overlaps and bloom stay gold, not white
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const ball = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), ballMat);
  ball.position.z = 4;
  scene.add(ball);
  // its size on screen (the quad is 4x the ball): small at first, full at the explosion
  const U = () => (Math.min(w, h) * 0.512) / 442; // follows the mandala's size
  let charge = 0;
  const placeBall = (time: number, grow = 1, alpha = 1) => {
    const e = charge * charge * (3 - 2 * charge);
    const R = (11 + 27 * e) * U() * grow;
    ball.scale.set(R * 4, R * 4, 1);
    ballMat.uniforms.uTime.value = time;
    ballMat.uniforms.uCharge.value = charge;
    ballMat.uniforms.uA.value = alpha;
    ball.visible = alpha > 0.01;
  };

  // compile every shader now (before the touch), so the first frames don't stall
  renderer.compile(scene, camera);

  const resize = (W: number, H: number) => {
    w = W;
    h = H;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    placeCamera();
    for (const m of [burstMat, dissolveMat]) {
      m.uniforms.uScale.value = S();
      m.uniforms.uCamZ.value = camZ();
    }
    waveMat.uniforms.uRes.value.set(w, h);
    waveMat.uniforms.uScale.value = S();
    buildDissolve();
    buildTrails();
  };

  let raf = 0, alive = true;
  let tl: ReturnType<typeof gsap.timeline> | null = null;
  // before the explosion only the ball is drawn
  let idle = 0;
  const idleFrame = (now: number) => {
    if (!alive) return;
    placeBall(now / 1000);
    composer.render();
    idle = requestAnimationFrame(idleFrame);
  };
  idle = requestAnimationFrame(idleFrame);

  const dispose = () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(idle);
    tl?.kill();
    trailGroup.children.forEach((c) => (c as THREE_NS.Mesh).geometry.dispose());
    dissolveGeo.dispose();
    disposables.forEach((d) => d.dispose());
    bloom.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const play = (hooks: Hooks, opts: { scrub?: boolean } = {}) => {
    cancelAnimationFrame(idle); // the explosion's loop draws the ball from now on
    const s = S();
    // everything the timeline animates
    const st = { spark: 0, hot: 0, light: 0, rings: 0, trails: 0, shock: 0, shockA: 0, wave: 0, waveA: 0, mandala: 0, fade: 1 };
    let revealStarted = false;
    burst.visible = true;
    trailGroup.visible = true;
    rings.forEach((r) => (r.m.visible = true));
    dissolve!.visible = true;
    // the reveal wave's travel: from 0 to past the corners (raggedness included)
    const waveEnd = far() + WAVE_RAG * s * 2 + 30 * s;
    dissolveMat.uniforms.uWaveSpeed.value = waveEnd / (REVEAL_END - REVEAL_START);
    dissolveMat.uniforms.uRag.value = WAVE_RAG * s;
    waveMat.uniforms.uRag.value = WAVE_RAG * s;

    const frame = () => {
      if (!alive) return;
      const t = tl ? tl.time() : 0; // the timeline is the one clock, so every part stays in step
      // the ball swells into the explosion and is gone (still there at t = 0, when scrubbing back)
      placeBall(performance.now() / 1000, 1 + 3 * Math.min(1, t / 0.12), 1 - Math.min(1, t / 0.12));
      // spark and light
      const sparkSize = (30 + 170 * st.spark + 260 * st.light) * s;
      glow.scale.set(sparkSize * 2, sparkSize * 2, 1);
      glowMat.uniforms.uI.value = Math.max(st.spark, st.light) * st.fade;
      glowMat.uniforms.uHot.value = st.hot;
      light.intensity = st.light * 9e5 * s * s;
      // particles
      burstMat.uniforms.uTime.value = Math.max(0, t - SPARK_END);
      burstMat.uniforms.uFade.value = st.fade;
      // rings
      rings.forEach((r) => {
        const p = Math.min(1, Math.max(0, (st.rings * 1.0 - r.delay) / (1 - r.delay)));
        const R = Math.max(1, far() * r.reach * p);
        r.m.scale.set(R, R, R * 0.6);
        r.m.rotation.z += 0.004;
        r.mat.opacity = Math.sin(Math.PI * Math.min(1, p * 1.05)) * 0.9 * st.fade;
      });
      // trails
      trailMat.uniforms.uHead.value = st.trails * 1.42;
      trailMat.uniforms.uFade.value = (1 - Math.max(0, st.trails - 0.7) / 0.3) * st.fade;
      // shockwave and the reveal wave
      waveMat.uniforms.uTime.value = t;
      waveMat.uniforms.uShock.value = st.shock * far() * 1.05;
      waveMat.uniforms.uShockA.value = st.shockA * st.fade;
      const waveR = st.wave * waveEnd;
      waveMat.uniforms.uWave.value = waveR;
      waveMat.uniforms.uWaveA.value = st.waveA * st.fade;
      dissolveMat.uniforms.uTime.value = t;
      dissolveMat.uniforms.uWave.value = waveR;
      dissolveMat.uniforms.uTail.value = Math.max(0, t - REVEAL_END);
      dissolveMat.uniforms.uFade.value = st.fade;
      // the loader's cut follows the same edge
      if (t >= REVEAL_START) {
        if (!revealStarted) {
          revealStarted = true;
          hooks.onReveal();
        }
        hooks.cut({ radius: waveR, rag: WAVE_RAG * s, time: t });
      } else hooks.cut(null);
      // at 0 (before the touch, when scrubbing) the loader's own build-up owns the mandala
      if (t > 0) hooks.mandala(st.mandala);
      composer.render();
      raf = requestAnimationFrame(frame);
    };

    tl = gsap.timeline({
      paused: !!opts.scrub,
      onComplete: () => {
        if (opts.scrub) return; // kept, so it can be moved back
        hooks.cut(null);
        dispose(); // stops the loop and frees the GPU
        hooks.onDone();
      },
    });
    tl
      // 1. the spark: a tiny core that swells a little and holds
      .to(st, { spark: 1, hot: 1, light: 0.35, duration: SPARK_END, ease: "power2.out" }, 0)
      // 2. the explosion
      .to(st, { light: 1, duration: 0.12, ease: "power2.out" }, SPARK_END)
      .to(st, { spark: 0.25, hot: 0.4, duration: REVEAL_START - SPARK_END, ease: "power2.out" }, SPARK_END)
      .to(st, { rings: 1, duration: 1.0, ease: "power2.out" }, SPARK_END)
      .to(st, { trails: 1, duration: 0.95, ease: "power1.inOut" }, SPARK_END)
      .to(st, { shock: 1, duration: 0.75, ease: "power2.out" }, SPARK_END + 0.04)
      .fromTo(st, { shockA: 1 }, { shockA: 0, duration: 0.75, ease: "power1.in" }, SPARK_END + 0.04)
      .to(st, { mandala: 1, duration: REVEAL_START - SPARK_END, ease: "power2.out" }, SPARK_END)
      .to(st, { mandala: 0, duration: REVEAL_END - REVEAL_START, ease: "power1.in" }, REVEAL_START)
      // 3. the reveal
      .to(st, { waveA: 1, duration: 0.15 }, REVEAL_START)
      .to(st, { wave: 1, duration: REVEAL_END - REVEAL_START, ease: "power2.inOut" }, REVEAL_START)
      .to(st, { light: 0, spark: 0, hot: 0, duration: 0.6, ease: "power1.out" }, REVEAL_START)
      // 4. fade out what's left
      .to(st, { fade: 0, duration: END - REVEAL_END, ease: "power1.in" }, REVEAL_END);
    // development only: lets a test jump to any moment (window.__goldenTl.pause(seconds))
    if (process.env.NODE_ENV !== "production") (window as unknown as { __goldenTl?: unknown }).__goldenTl = tl;
    raf = requestAnimationFrame(frame);
    return tl;
  };

  return {
    play,
    resize,
    dispose,
    setCharge: (k: number) => {
      charge = Math.min(1, Math.max(0, k));
    },
  };
}
