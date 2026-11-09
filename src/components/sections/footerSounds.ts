"use client";

// Hover sounds for the footer's table props, synthesized with the Web Audio
// API (no files). Browsers only allow audio after the visitor has interacted
// with the page (a click or key press), so before that these stay silent.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx.state === "running" ? ctx : null;
}

// Old computer waking up: a short CRT power-on "thunk", the high whine of the
// tube, a low fan hum, and two quick boot beeps. Returns a stop function
// (fades everything out when the hover ends).
export function playComputerHover(): () => void {
  const ac = audio();
  if (!ac) return () => {};
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = 1;
  out.connect(ac.destination);

  // thunk
  const th = ac.createOscillator();
  th.frequency.setValueAtTime(120, t);
  th.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  const thg = ac.createGain();
  thg.gain.setValueAtTime(0.35, t);
  thg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  th.connect(thg).connect(out);
  th.start(t);
  th.stop(t + 0.2);

  // CRT whine (high, quiet) + fan hum (low), held while hovering
  const whine = ac.createOscillator();
  whine.frequency.value = 15700;
  const wg = ac.createGain();
  wg.gain.setValueAtTime(0.0001, t);
  wg.gain.exponentialRampToValueAtTime(0.012, t + 0.3);
  whine.connect(wg).connect(out);
  const hum = ac.createOscillator();
  hum.type = "sawtooth";
  hum.frequency.value = 58;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  const hg = ac.createGain();
  hg.gain.setValueAtTime(0.0001, t);
  hg.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
  hum.connect(lp).connect(hg).connect(out);
  whine.start(t);
  hum.start(t);

  // boot beeps
  for (const [at, f] of [
    [0.32, 880],
    [0.48, 1320],
  ] as const) {
    const b = ac.createOscillator();
    b.type = "square";
    b.frequency.value = f;
    const bg = ac.createGain();
    bg.gain.setValueAtTime(0.0001, t + at);
    bg.gain.exponentialRampToValueAtTime(0.05, t + at + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.11);
    b.connect(bg).connect(out);
    b.start(t + at);
    b.stop(t + at + 0.12);
  }

  return () => {
    const now = ac.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    whine.stop(now + 0.3);
    hum.stop(now + 0.3);
  };
}

// Old rotary phone bell: a fast metallic trill (two bell partials, hammered
// ~20x a second) in "ring-ring" bursts, repeating until the hover ends.
export function playPhoneRing(): () => void {
  const ac = audio();
  if (!ac) return () => {};
  const out = ac.createGain();
  out.gain.value = 1;
  out.connect(ac.destination);
  const nodes: OscillatorNode[] = [];
  const start = ac.currentTime + 0.02;
  // up to 3 cycles of: ring 0.4s, gap 0.2s, ring 0.4s, pause 1.4s
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const off of [0, 0.6]) {
      const at = start + cycle * 2.4 + off;
      for (let k = 0; k < 8; k++) {
        const hit = at + k * 0.05;
        for (const [f, g] of [
          [1150, 0.07],
          [1720, 0.035],
        ] as const) {
          const o = ac.createOscillator();
          o.frequency.value = f;
          const og = ac.createGain();
          og.gain.setValueAtTime(0.0001, hit);
          og.gain.exponentialRampToValueAtTime(g, hit + 0.004);
          og.gain.exponentialRampToValueAtTime(0.0001, hit + 0.12);
          o.connect(og).connect(out);
          o.start(hit);
          o.stop(hit + 0.13);
          nodes.push(o);
        }
      }
    }
  }
  return () => {
    const now = ac.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    for (const o of nodes) {
      try {
        o.stop(now + 0.1);
      } catch {
        // already stopped
      }
    }
  };
}
