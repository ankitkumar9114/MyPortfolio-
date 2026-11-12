// The loader's water: the surface drawn on the GPU with three.js (one
// full-screen shader, a single quad over the loader), and the matching
// numbers for the refraction of the loader underneath (an SVG displacement
// filter in MughalFrame).
//
//   front  - radius (px) of the water spreading out from the touch: a
//            translucent grey surface with moving ripples, rings running out
//            from the touch, highlights and reflections (Fresnel, water's
//            refractive index), and a bright crest at its edge
//   hole   - radius (px) of the opening that shows the site: inside its
//            wobbling edge (waterEdge) the canvas is clear, with a bright
//            meniscus line along it

import type * as THREE_NS from "three";

// water's refractive index, and the share of light it reflects head-on
// (Fresnel: ((n - 1) / (n + 1))^2, about 2%)
export const WATER_IOR = 1.333;
const F0 = Math.pow((WATER_IOR - 1) / (WATER_IOR + 1), 2);
// how far the loader under the water is shifted at the ripples' steepest
// (px on a laptop screen): a ripple's slope times the water's depth, bent by
// (1 - 1/n) on its way through the surface
const RIPPLE_SLOPE = 0.35;
const WATER_DEPTH = 90; // px
export const REFRACT_PX = RIPPLE_SLOPE * WATER_DEPTH * (1 - 1 / WATER_IOR) * 2;

export const EDGE_WOBBLE = 34; // px (laptop screen): how much the opening's edge wobbles
// the opening's edge at angle a, time t (s since the touch), -1..1: the
// shader uses exactly the same formula, so the loader's cut (a clip-path)
// and the drawn edge line up
export const waterEdge = (a: number, t: number) =>
  0.5 * Math.sin(5 * a + 1.7 * t) + 0.3 * Math.sin(9 * a - 2.3 * t + 1.0) + 0.2 * Math.sin(14 * a + 3.1 * t + 2.0);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;     // canvas size, px
uniform float uTime;   // s since the touch
uniform float uFront;  // px
uniform float uHole;   // px
uniform float uWobble; // px
uniform float uScale;  // screen size / laptop
uniform float uF0;     // Fresnel reflectance head-on

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
float edgeW(float a, float t) {
  return 0.5 * sin(5.0 * a + 1.7 * t) + 0.3 * sin(9.0 * a - 2.3 * t + 1.0) + 0.2 * sin(14.0 * a + 3.1 * t + 2.0);
}
// the water's surface height at p (px from the centre): slow swell, and
// rings running out from the touch, fading with distance
float surf(vec2 p) {
  float s = 1.0 / (260.0 * uScale);
  float d = length(p);
  float h = fbm(p * s + vec2(uTime * 0.22, uTime * 0.16)) * 0.65 + fbm(p * s * 1.9 - vec2(uTime * 0.27, -uTime * 0.2)) * 0.35;
  float rings = sin(d / (22.0 * uScale) - uTime * 6.0) * exp(-d / (uFront * 0.5 + 1.0)) * exp(-uTime * 0.6);
  return h + 0.18 * rings;
}

void main() {
  vec2 p = vUv * uRes - 0.5 * uRes;
  p.y = -p.y; // screen y runs down
  float d = length(p);
  float a = atan(p.y, p.x);

  // the surface's slope -> its normal
  float e = 2.0 * uScale;
  float hx = surf(p + vec2(e, 0.0)) - surf(p - vec2(e, 0.0));
  float hy = surf(p + vec2(0.0, e)) - surf(p - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx * 9.0, -hy * 9.0, 1.0));

  // light from the top left; looking straight down
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 220.0);
  float cosT = max(dot(n, V), 0.0);
  float fres = uF0 + (1.0 - uF0) * pow(1.0 - cosT, 5.0); // Schlick
  // caustic-like bright threads where the surface folds
  float h0 = surf(p);
  float caus = pow(1.0 - abs(sin(h0 * 9.0)), 10.0);

  // translucent grey water, plus what it reflects (sky-grey sheen and the
  // light's glints)
  vec3 tint = vec3(0.6, 0.64, 0.66);
  // soft broad sheen across the swell (light catching the slopes)
  float sheen = smoothstep(0.35, 0.9, dot(n, L) * 0.5 + 0.5) * 0.12;
  float alpha = 0.34 + fres * 0.9 + spec * 0.35 + caus * 0.06 + sheen;
  vec3 col = tint * 0.34 + vec3(0.86, 0.9, 0.93) * (fres * 0.9 + sheen) + vec3(1.0) * spec * 0.35 + vec3(0.95) * caus * 0.06;

  // only where the water has spread to, with a bright crest at its front
  float edge = uFront * (0.97 + 0.03 * edgeW(a * 1.3, uTime));
  float cover = smoothstep(edge, edge - 40.0 * uScale, d);
  float crest = smoothstep(26.0 * uScale, 0.0, abs(d - edge)) * step(1.0, uFront);
  col = col * cover + vec3(0.92, 0.95, 0.97) * crest * 0.55;
  alpha = alpha * cover + crest * 0.55;

  // the opening to the site: clear inside the wobbling edge, a bright
  // meniscus line right along it and a faint shadow just outside
  if (uHole > 0.0) {
    float hr = uHole + uWobble * edgeW(a, uTime);
    float x = d - hr;
    if (x < 0.0) {
      col = vec3(0.0);
      alpha = 0.0;
    } else {
      float line = smoothstep(5.0 * uScale, 0.0, x) * smoothstep(0.0, 1.2, x);
      float shade = smoothstep(26.0 * uScale, 5.0 * uScale, x) * (1.0 - line);
      col = mix(col, vec3(0.96, 0.98, 1.0), line);
      alpha = max(alpha, line * 0.95);
      col *= 1.0 - shade * 0.25;
      alpha = min(1.0, alpha + shade * 0.12);
    }
  }
  gl_FragColor = vec4(min(col, vec3(alpha)), alpha); // premultiplied
}
`;

export type WaterSurface = {
  render: (u: { time: number; front: number; hole: number; wobble: number }) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

// Sets the shader up on `canvas`; null if WebGL isn't available.
export function createWaterSurface(THREE: typeof THREE_NS, canvas: HTMLCanvasElement, w: number, h: number): WaterSurface | null {
  let renderer: THREE_NS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uRes: { value: new THREE.Vector2(w, h) },
    uTime: { value: 0 },
    uFront: { value: 0 },
    uHole: { value: 0 },
    uWobble: { value: EDGE_WOBBLE },
    uScale: { value: 1 },
    uF0: { value: F0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  const resize = (W: number, H: number) => {
    renderer.setSize(W, H, false);
    // the shader works in CSS px (uRes), whatever the pixel ratio
    uniforms.uRes.value.set(W, H);
    const scale = Math.hypot(W, H) / 2 / 900;
    uniforms.uScale.value = scale;
  };
  resize(w, h);

  return {
    render: ({ time, front, hole, wobble }) => {
      uniforms.uTime.value = time;
      uniforms.uWobble.value = wobble;
      uniforms.uFront.value = front;
      uniforms.uHole.value = hole;
      renderer.render(scene, camera);
    },
    resize,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
