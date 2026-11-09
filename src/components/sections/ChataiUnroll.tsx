"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion, useScroll } from "framer-motion";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

// A woven chatai unrolling LEFT -> RIGHT on the section's pink fabric floor,
// seen from a fixed straight-down camera, rendered with three.js (transparent
// canvas; the floor only catches shadows). Pinned full-screen: a track
// (100vh + a short hold) holds a sticky 100vh frame. The unroll is scrubbed
// by scroll from the moment the paragraph above finishes highlighting until
// the frame exactly covers the window, so scrolling back up rolls it back
// up. The mat's height always equals the window's height, centered.
//
// Geometry is a procedural unroll (no physics engine): one grid along the
// mat's length (Z) and width (X). Each column across the width unrolls by its
// own slightly skewed distance, the rolled part winds into an Archimedean
// spiral, and the tail flops flat at the end. The roll's outside shows the
// mat's back face: the same photo with blue/white swapped (a reversible
// chatai). Lighting is soft morning daylight from a window on one side.

const SRC = "/images/chatai.webp";

// Mat + unroll
const L = 3.0; // mat length (world units, along Z = the image's horizontal)
const NU = 640; // segments along the length
const NX = 72; // segments across the width
const RC = 0.024; // roll core radius
const WIND = 0.0062; // mat thickness per wind

// Timeline (seconds), scrubbed by scroll. No opening hold: the unroll starts
// the moment the previous paragraph's last word is highlighted (see
// startLine), runs while the frame scrolls up and pins, then holds flat.
const UNROLL_S = 12;
const TOTAL = UNROLL_S;
// The unroll completes exactly when the frame fully covers the window (its
// top reaches the window's top); it then stays pinned, flat, for this long.
const HOLD_VH = 0.7; // pinned scroll after the unroll, in viewport heights
// The scene counts as "open" (stickers + fan in) only this far into the
// pinned hold. Scrolling back up, they leave there first, and the mat only
// starts rolling up once the pin point is passed (frame top above 0).
const OPEN_AT_VH = 0.15;
const SHADOW_BLEED = 160; // px the canvas extends above the frame, for soft shadows
const ease = (p: number) => p * p * (1.6 - 0.6 * p); // slow start, builds speed

// Camera
const FOV = 36;
const ROLL_PEEK = 0.065; // world units of the roll visible at the window's left edge as it starts

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Crop the photo to the mat: bounding box of pixels where blue - red > 70.
function cropToMat(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 0 && data[i + 2] - data[i] > 70) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return c;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Front map: the photo with subtle fibre imperfections baked in.
function buildFrontMap(crop: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = crop.width;
  c.height = crop.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(crop, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const rnd = mulberry32(7);
  const rows = Array.from({ length: Math.ceil(c.height / 3) }, () => 0.94 + rnd() * 0.06);
  const cols = Array.from({ length: c.width }, () => 0.985 + rnd() * 0.015);
  for (let y = 0; y < c.height; y++) {
    const band = 1 - 0.018 * (0.5 + 0.5 * Math.sin(y * 0.021 + 1.3)) - 0.012 * (0.5 + 0.5 * Math.sin(y * 0.0067));
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const grain = 1 + (rnd() - 0.5) * 0.04;
      const f = rows[(y / 3) | 0] * band * cols[x] * grain * (1 - 0.01 * (0.5 + 0.5 * Math.sin(x * 0.013)));
      d[i] *= f;
      d[i + 1] *= f;
      d[i + 2] *= f;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Back map: the same weave with colours swapped (blue -> off-white #ECECE6,
// white -> blue #26A0DA), keeping the photo's luminance detail.
function buildBackMap(front: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = front.width;
  c.height = front.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(front, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const BLUE = [0x26, 0xa0, 0xda];
  const OFF = [0xec, 0xec, 0xe6];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const t = clamp((b - r - 25) / 120, 0, 1); // 1 = blue print, 0 = white ground
    const lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    const ref = 0.93 + (0.55 - 0.93) * t; // typical luminance of white / blue
    const detail = clamp(lum / ref, 0.72, 1.12);
    for (let k = 0; k < 3; k++) d[i + k] = clamp((BLUE[k] + (OFF[k] - BLUE[k]) * t) * detail, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Bump: procedural 256² basket weave, 16x16 cells alternating horizontal and
// vertical strands (dark-bright-dark across each), random cell brightness.
function buildBumpMap() {
  const S = 256, CELL = 16;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  const rnd = mulberry32(11);
  const cellB = Array.from({ length: (S / CELL) ** 2 }, () => 0.82 + rnd() * 0.28);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
      const horizontal = (cx + cy) % 2 === 0;
      const along = horizontal ? (y % CELL) + 0.5 : (x % CELL) + 0.5;
      const profile = Math.sin((Math.PI * along) / CELL); // dark-bright-dark
      const v = (0.18 + 0.72 * profile) * cellB[cy * (S / CELL) + cx] + (rnd() - 0.5) * 0.08;
      const p = clamp(v * 255, 0, 255);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = p;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Contact-shadow strip texture (used as an alpha map): darkest in the middle
// of its depth, and fading out softly at both ends of its length too (no
// hard-edged cut where it passes the mat's edges).
function buildStripTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const img = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    const across = Math.sin((Math.PI * (y + 0.5)) / 128) ** 2; // dark in the middle
    for (let x = 0; x < 128; x++) {
      const t = (x + 0.5) / 128;
      const ends = smoothstep(0, 0.1, t) * smoothstep(0, 0.1, 1 - t);
      const v = Math.round(255 * across * ends);
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (s: number, time: number) => void;
  setSize: (w: number, h: number) => void;
  dispose: () => void;
  startS: () => number;
  endS: () => number;
};

// Text printed into the mat's texture at its center (so it's revealed exactly
// like the woven pattern: hidden inside the roll, crisp where the mat lies
// flat). Sizes are in on-screen css px (the mat's height = the window's).
export type ChataiPrint = {
  title: string;
  subtitle: string;
  color: string; // title
  subColor: string; // subtitle + rules
  opacity: number;
};

function cssFont(varName: string, fallback: string) {
  const v = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return v || fallback;
}

function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (line && g.measureText(t).width > maxW) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws `front` plus the print into `out` (same size). vw/vh: the window.
function drawPrinted(out: HTMLCanvasElement, front: HTMLCanvasElement, print: ChataiPrint, vw: number, vh: number) {
  const g = out.getContext("2d")!;
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.clearRect(0, 0, out.width, out.height);
  g.drawImage(front, 0, 0);
  const k = out.height / vh; // texture px per screen px
  const titlePx = clamp(0.047 * vw, 32, 68) * k;
  const subPx = clamp(0.02 * vw, 18, 28) * k;
  const maxW = Math.min(566, vw - 32) * k;
  const cx = out.width / 2, cy = out.height / 2;
  const arvo = cssFont("--font-arvo", "Arvo, serif");
  const serif = cssFont("--font-serif", "Merriweather, serif");
  // multiply: ink soaked into the weave (the fibres' texture shows through)
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = print.opacity;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const gl = g as CanvasRenderingContext2D & { letterSpacing?: string };
  g.font = `700 ${titlePx}px ${arvo}`;
  gl.letterSpacing = `${-0.02 * titlePx}px`;
  const lines = wrapLines(g, print.title.toUpperCase(), maxW);
  const lineH = titlePx * 1.05;
  const gap = 28 * k;
  const subH = subPx * 1.05;
  const blockH = lines.length * lineH + gap + subH;
  let y = cy - blockH / 2 + lineH / 2;
  g.fillStyle = print.color;
  for (const ln of lines) {
    g.fillText(ln, cx, y);
    y += lineH;
  }
  // subtitle with a rule on each side, 48px from the text
  const sy = cy + blockH / 2 - subH / 2;
  g.font = `700 ${subPx}px ${serif}`;
  gl.letterSpacing = `${0.04 * subPx}px`;
  g.fillStyle = print.subColor;
  g.fillText(print.subtitle, cx, sy);
  const tw = g.measureText(print.subtitle).width;
  const ruleGap = (vw >= 640 ? 48 : 24) * k;
  const left = cx - maxW / 2, right = cx + maxW / 2;
  const rh = Math.max(1, 2 * k);
  g.fillRect(left, sy - rh / 2, cx - tw / 2 - ruleGap - left, rh);
  g.fillRect(cx + tw / 2 + ruleGap, sy - rh / 2, right - (cx + tw / 2 + ruleGap), rh);
  gl.letterSpacing = "0px";
}

function createStage(canvas: HTMLCanvasElement, crop: HTMLCanvasElement, print?: ChataiPrint): Stage {
  const W = L * (crop.height / crop.width); // mat width (X)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  // PCF (not PCFSoft) so shadow.radius below actually blurs the edges
  renderer.shadowMap.type = THREE.PCFShadowMap;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene(); // transparent: the pink panel shows through

  // Floor: invisible except for the shadows it catches (burgundy, on the pink)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x3a0016, opacity: 0.32 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.0015;
  floor.receiveShadow = true;
  scene.add(floor);

  // Textures
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const front = buildFrontMap(crop);
  // the texture shows `front` + the print, redrawn when the window resizes
  const printed = document.createElement("canvas");
  printed.width = front.width;
  printed.height = front.height;
  printed.getContext("2d")!.drawImage(front, 0, 0);
  const frontTex = new THREE.CanvasTexture(printed);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = maxAniso;
  const backTex = new THREE.CanvasTexture(buildBackMap(front));
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = maxAniso;
  const bumpTex = new THREE.CanvasTexture(buildBumpMap());
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(17, (17 * W) / L);
  bumpTex.anisotropy = maxAniso;

  // Mat geometry: (NU+1) x (NX+1) grid; u along the length, v across.
  const cols = NX + 1, rows = NU + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      uvs[k * 2] = i / NU;
      uvs[k * 2 + 1] = j / NX;
    }
  }
  const index = new Uint32Array(NU * NX * 6);
  let n = 0;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NX; j++) {
      const a = i * cols + j, b = (i + 1) * cols + j, c = i * cols + j + 1, d = (i + 1) * cols + j + 1;
      // wound so the front face (photo side) faces up (+Y) when flat
      index[n++] = a; index[n++] = b; index[n++] = c;
      index[n++] = b; index[n++] = d; index[n++] = c;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));

  const mat = new THREE.MeshStandardMaterial({
    map: frontTex,
    bumpMap: bumpTex,
    bumpScale: 1.4,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.backMap = { value: backTex };
    shader.vertexShader =
      "varying float vWorldY;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;",
      );
    shader.fragmentShader =
      "uniform sampler2D backMap;\nvarying float vWorldY;\n" +
      shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
  vec4 sampledDiffuseColor = gl_FrontFacing ? texture2D( map, vMapUv ) : texture2D( backMap, vMapUv );
  diffuseColor *= sampledDiffuseColor;
#endif`,
        )
        // fake AO on the roll: less indirect light as the surface rises
        .replace(
          "#include <aomap_fragment>",
          "#include <aomap_fragment>\n  reflectedLight.indirectDiffuse *= 1.0 - 0.25 * clamp( vWorldY / 0.035, 0.0, 1.0 );",
        );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Contact shadow / AO strip on the floor under the roll line
  const stripTex = new THREE.CanvasTexture(buildStripTexture());
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x3a0016, alphaMap: stripTex, transparent: true, depthWrite: false });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.12, 1), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = -0.001;
  scene.add(strip);

  // Lights: soft morning daylight from a window on one side
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.5);
  sun.position.set(-2.8, 2.6, -1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -2.6;
  sc.right = sc.top = 2.6;
  sc.near = 0.1;
  sc.far = 12;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.012;
  sun.shadow.radius = 6;
  scene.add(sun);
  const win = new THREE.RectAreaLight(0xf2f5ff, 4.2, 2.4, 1.8);
  win.position.set(-2.9, 1.1, -0.2);
  win.lookAt(0.4, 0, 0.1);
  scene.add(win);
  scene.add(new THREE.HemisphereLight(0xeaf1ff, 0x15130f, 0.55));
  const fill = new THREE.DirectionalLight(0xd6e2f5, 0.22);
  fill.position.set(3, 1.5, 2);
  scene.add(fill);

  // Camera: straight down, screen-up = +X so the mat (along +Z) unrolls
  // left -> right. Framed in setSize; never moves otherwise.
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 50);
  camera.up.set(1, 0, 0);

  // Per-column constants (x across the width, slightly uneven thickness)
  const colX = new Float32Array(cols);
  const colH = new Float32Array(cols);
  for (let j = 0; j < cols; j++) {
    const x = -W / 2 + (j / NX) * W;
    const xn = x / W;
    colX[j] = x;
    colH[j] = WIND * (1 + 0.07 * Math.sin(xn * 9.1 + 1.3) + 0.04 * Math.sin(xn * 23.7 + 0.4));
  }

  // Unrolled length at the start of the animation (set in setSize).
  let sStart = 0;
  let sEnd = L;

  const update = (s: number, time: number) => {
    const p = s / L;
    const skewAmt = Math.sin(Math.PI * Math.min(1, p * 1.1));
    for (let j = 0; j < cols; j++) {
      const x = colX[j], xn = x / W, h = colH[j];
      const skew = (0.018 * Math.sin(xn * 2.4 + 0.8) + 0.008 * Math.sin(xn * 7.3 + time * 0.35)) * skewAmt;
      const sj = clamp(s + skew, 0, L);
      const rem = L - sj;
      const R = Math.sqrt(RC * RC + (rem * h) / Math.PI);
      const flopK = clamp(rem / 0.09, 0, 1); // tail flops flat at the very end
      const edge = smoothstep(0.4, 0.5, Math.abs(xn));
      for (let i = 0; i < rows; i++) {
        const u = (i / NU) * L;
        let y: number, z: number;
        if (u <= sj) {
          z = -L / 2 + u;
          const fade = clamp((sj - u) / 0.14, 0, 1);
          const curl = 0.006 * Math.exp(-u / 0.05); // curl memory at the start edge
          const wave = 0.0045 * edge * (0.6 + 0.4 * Math.sin(u * 11 + xn * 5));
          const ripple = 0.0012 * Math.sin(u * 7.3 + xn * 4.1) * Math.sin(u * 2.9 - xn * 6.7 + 1.1);
          const behind = 1 - clamp((sj - u) / 0.08, 0, 1);
          y = (curl + wave + ripple) * fade + 0.0035 * behind * behind;
        } else {
          const l = u - sj;
          let r = Math.sqrt(Math.max(0.98 * RC * RC, R * R - (l * h) / Math.PI));
          const phi = ((2 * Math.PI) / h) * (R - r);
          r *= 1 + 0.012 * Math.sin(phi / 2 + 2.3 * x);
          const zr = -L / 2 + sj + r * Math.sin(phi);
          const yr = R - r * Math.cos(phi);
          const zf = -L / 2 + u;
          z = zf + (zr - zf) * flopK;
          y = yr * flopK;
        }
        const k = (i * cols + j) * 3;
        positions[k] = x;
        positions[k + 1] = y;
        positions[k + 2] = z;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    // contact strip follows the roll line
    const rem = L - s;
    const R = Math.sqrt(RC * RC + (rem * WIND) / Math.PI);
    strip.position.z = -L / 2 + s;
    strip.scale.y = Math.max(0.001, R * 4.2);
    stripMat.opacity = 0.55 * Math.min(1, 0.25 + 9 * R) * clamp(rem / 0.15, 0, 1);
  };

  // The canvas extends SHADOW_BLEED px above the frame (same framing, via a
  // view offset), so shadows near the mat's top edge fade out naturally
  // over the pink instead of being clipped at the frame's top edge.
  const setSize = (w: number, h: number) => {
    renderer.setSize(w, h + SHADOW_BLEED, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.setViewOffset(w, h, 0, -SHADOW_BLEED, w, h + SHADOW_BLEED);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // The mat's height (its width W, which runs up the screen) exactly fills
    // the window's height, centered vertically (camera over x = 0).
    const camH = W / 2 / t;
    const halfZ = camH * t * aspect;
    // Static camera, centered on the mat: its white middle sits at the
    // window's center. The animation starts with whatever lies off-screen to
    // the left already unrolled, so the roll begins at the window's left
    // edge with ROLL_PEEK of it showing.
    camera.position.set(0, camH, 0);
    camera.lookAt(0, 0, 0);
    const leftEdge = -halfZ;
    let s0 = 0;
    for (let k = 0; k < 4; k++) {
      const R = Math.sqrt(RC * RC + ((L - s0) * WIND) / Math.PI);
      s0 = clamp(leftEdge + ROLL_PEEK - R + L / 2, 0, L * 0.9);
    }
    sStart = s0;
    // End: stop once the roll has rolled off the window's right edge (the
    // rest, off-screen, counts as flat), so the visible unroll fills the
    // whole scroll.
    let s1 = L;
    for (let k = 0; k < 4; k++) {
      const R = Math.sqrt(RC * RC + ((L - s1) * WIND) / Math.PI);
      s1 = clamp(halfZ + 0.05 + R + L / 2, s0 + 0.01, L);
    }
    sEnd = s1;
    camera.updateProjectionMatrix();
    if (print) {
      lastView = [w, h];
      drawPrinted(printed, front, print, w, h);
      frontTex.needsUpdate = true;
    }
  };
  let lastView: [number, number] | null = null;
  // redraw the print once the web fonts have loaded
  if (print && document.fonts) {
    const arvo = cssFont("--font-arvo", "Arvo");
    const serif = cssFont("--font-serif", "Merriweather");
    Promise.all([document.fonts.load(`700 40px ${arvo}`), document.fonts.load(`700 20px ${serif}`)]).then(() => {
      if (!lastView) return;
      drawPrinted(printed, front, print, lastView[0], lastView[1]);
      frontTex.needsUpdate = true;
    });
  }

  const dispose = () => {
    geo.dispose();
    mat.dispose();
    frontTex.dispose();
    backTex.dispose();
    bumpTex.dispose();
    stripTex.dispose();
    stripMat.dispose();
    strip.geometry.dispose();
    floor.geometry.dispose();
    (floor.material as THREE.Material).dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, update, setSize, dispose, startS: () => sStart, endS: () => sEnd };
}

// The pink panel the scene sits on (owned by TvOnCabinet), so the pinned
// frame can paint an identical, aligned copy of it behind the canvas.
export type ChataiBackdrop = {
  panelRef: RefObject<HTMLElement | null>;
  background: string; // the panel's gradient
  fabricSrc: string;
  fabricTilePx: number; // on-screen tile width
  fabricOpacity: number;
};

export default function ChataiUnroll({
  style,
  backdrop,
  startLine = 0.58,
  startGapPx = 0,
  print,
  children,
}: {
  style?: React.CSSProperties;
  backdrop?: ChataiBackdrop;
  // The unroll starts when the track's top is (startLine x window height +
  // startGapPx) down the window: with the paragraph above ending startGapPx
  // above the track, that's when its bottom crosses its highlight line, i.e.
  // the moment its last word turns white.
  startLine?: number;
  startGapPx?: number;
  // Text printed on the mat's center (revealed with the mat as it unrolls).
  print?: ChataiPrint;
  // Extra layers over the scene inside the pinned frame (e.g. a fan shadow).
  children?: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  // Frame's offset inside the page's pink panel + the panel's on-screen
  // height (for the gradient), measured while the frame is still in flow, so
  // the pink + fabric continue seamlessly and then hold still while pinned.
  const [bg, setBg] = useState<{ x: number; y: number; h: number } | null>(null);
  const panelRef = backdrop?.panelRef;
  const { scrollY } = useScroll();
  useEffect(() => {
    const track = trackRef.current;
    if (!panelRef || !track) return;
    const sync = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const t = track.getBoundingClientRect();
      if (t.top < 0) return; // pinned (or past): keep the last alignment
      const pr = panel.getBoundingClientRect();
      const next = { x: Math.round(t.left - pr.left), y: Math.round(t.top - pr.top), h: Math.round(pr.height) };
      setBg((cur) => (cur && cur.x === next.x && cur.y === next.y && cur.h === next.h ? cur : next));
    };
    let raf = requestAnimationFrame(sync);
    // Measure now and again next frame: other scroll-driven transforms (the
    // TV scene's zoom, which sizes the panel) may update after this handler.
    const off = scrollY.on("change", () => {
      sync();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    });
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      off();
      ro.disconnect();
    };
  }, [panelRef, scrollY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!canvas || !frame || !track) return;
    // clear any mask left on the canvas by an earlier version (hot reload)
    canvas.style.removeProperty("mask-image");
    canvas.style.removeProperty("-webkit-mask-image");
    let disposed = false;
    let raf = 0;
    let visible = true;
    let stage: Stage | null = null;
    let seekT: number | null = null;
    const clock = new THREE.Clock();

    // debug: window.__seek(t) pins the timeline to t seconds until the next scroll
    const win = window as unknown as { __seek?: (t: number) => void };
    win.__seek = (t: number) => {
      seekT = clamp(t, 0, TOTAL);
    };
    const offScroll = scrollY.on("change", () => {
      seekT = null;
    });

    const frameLoop = () => {
      raf = 0;
      if (disposed || !stage) return;
      // scroll progress: 0 when the track's top is at the start line, 1 when
      // its pinned scroll ends
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const startTop = startLine * vh + startGapPx;
      const progress = clamp((startTop - r.top) / startTop, 0, 1); // 1 when the frame's top hits 0
      const T = reduceMotion ? TOTAL : (seekT ?? progress * TOTAL);
      const p = clamp(T / UNROLL_S, 0, 1);
      const s0 = stage.startS();
      const s1 = stage.endS();
      // unroll from s0 (roll at the left edge) to s1 (roll just off the
      // right edge); fully flat at the very end
      const sNow = p >= 1 ? L : s0 + ease(p) * (s1 - s0);
      stage.update(sNow, Math.min(clock.getElapsedTime(), 1e6));
      // data-open="true" once the mat lies flat AND the pinned scroll is
      // OPEN_AT_VH in (layers passed as children react via
      // group-data-[open=true]:...)
      const isOpen = reduceMotion || (sNow >= L && -r.top >= OPEN_AT_VH * vh);
      const open = isOpen ? "true" : "false";
      if (frame.dataset.open !== open) frame.dataset.open = open;
      stage.renderer.render(stage.scene, stage.camera);
      if (visible) raf = requestAnimationFrame(frameLoop);
    };
    const start = () => {
      if (!raf && visible) raf = requestAnimationFrame(frameLoop);
    };

    const ro = new ResizeObserver(() => {
      stage?.setSize(frame.clientWidth, frame.clientHeight);
      start();
    });
    // only render while the scene is on screen
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      // off screen the loop stops, so close the scene here (a fast scroll
      // away would otherwise leave stickers/photos "open")
      if (!visible && !reduceMotion) frame.dataset.open = "false";
      start();
    });

    loadImage(SRC).then((img) => {
      if (disposed) return;
      stage = createStage(canvas, cropToMat(img), print);
      stage.setSize(frame.clientWidth, frame.clientHeight);
      ro.observe(frame);
      io.observe(frame);
      start();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      offScroll();
      delete win.__seek;
      stage?.dispose();
    };
  }, [reduceMotion, scrollY, startLine, startGapPx, print]);

  return (
    <div
      ref={trackRef}
      className="relative"
      style={{
        // full-bleed: break out of the centered, padded column
        width: "100vw",
        alignSelf: "flex-start",
        marginLeft: "calc(50% - 50vw)",
        height: reduceMotion ? "100vh" : `${(1 + HOLD_VH) * 100}vh`,
        ...style,
      }}
    >
      <div ref={frameRef} data-open="false" className="group sticky top-0 isolate h-screen w-full">
        {backdrop && bg && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: backdrop.background, backgroundSize: `100% ${bg.h}px`, backgroundPosition: `0 ${-bg.y}px`, backgroundRepeat: "no-repeat" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url('${backdrop.fabricSrc}')`,
                backgroundRepeat: "repeat",
                backgroundSize: `${backdrop.fabricTilePx}px auto`,
                backgroundPosition: `${-bg.x}px ${-bg.y}px`,
                mixBlendMode: "multiply",
                opacity: backdrop.fabricOpacity,
              }}
            />
          </>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="A blue-flowered woven chatai unrolling across the floor"
          className="pointer-events-none absolute left-0 block w-full"
          style={{ top: -SHADOW_BLEED, height: `calc(100% + ${SHADOW_BLEED}px)` }}
        />
        {children}
        {print && (
          // the print is drawn into the WebGL texture; keep it readable for
          // screen readers
          <div className="sr-only">
            <h2>{print.title}</h2>
            <p>{print.subtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}
