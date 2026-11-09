"use client";

// Button sounds for the TV, synthesized with the Web Audio API (no audio
// files). One shared AudioContext, created on first use. Browsers only let
// audio start after the visitor has interacted with the page, so a sound
// triggered before that (e.g. the scroll switching the set on before any
// click) is silently skipped.

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

// A burst of white noise through a band-pass filter: the "plastic" part of
// a click.
function noiseBurst(ac: AudioContext, at: number, { duration, freq, q, gain }: { duration: number; freq: number; q: number; gain: number }) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(at);
  src.stop(at + duration);
}

// A short pitched blip that drops in pitch: the "body" of the button.
function tone(ac: AudioContext, at: number, { from, to, duration, gain, type = "sine" }: { from: number; to: number; duration: number; gain: number; type?: OscillatorType }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration);
}

// Regular buttons: a short, crisp plastic click (press, then a tiny release).
export function playButtonClick() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  noiseBurst(ac, t, { duration: 0.025, freq: 3200, q: 1.2, gain: 0.35 });
  tone(ac, t, { from: 1800, to: 900, duration: 0.03, gain: 0.08, type: "triangle" });
  noiseBurst(ac, t + 0.06, { duration: 0.015, freq: 4200, q: 1.5, gain: 0.12 });
}

// Power button: clearly different from the others. A heavy mechanical
// "thunk" (low thump + dull knock), then the classic CRT sound: switching
// ON adds a short degauss-style hum and a high whine that rises as the tube
// warms up; switching OFF adds a high whine that falls away and fades.
export function playPowerClick(turningOn: boolean) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  // thunk
  tone(ac, t, { from: 140, to: 45, duration: 0.18, gain: 0.5 });
  noiseBurst(ac, t, { duration: 0.06, freq: 600, q: 0.8, gain: 0.5 });
  noiseBurst(ac, t + 0.11, { duration: 0.04, freq: 1500, q: 1, gain: 0.15 });

  // CRT whine
  const whine = ac.createOscillator();
  whine.type = "sine";
  const wg = ac.createGain();
  const start = t + 0.12;
  if (turningOn) {
    whine.frequency.setValueAtTime(4500, start);
    whine.frequency.exponentialRampToValueAtTime(9500, start + 0.5);
    wg.gain.setValueAtTime(0.0001, start);
    wg.gain.exponentialRampToValueAtTime(0.035, start + 0.08);
    wg.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
  } else {
    whine.frequency.setValueAtTime(9500, start);
    whine.frequency.exponentialRampToValueAtTime(2500, start + 0.45);
    wg.gain.setValueAtTime(0.035, start);
    wg.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
  }
  whine.connect(wg).connect(ac.destination);
  whine.start(start);
  whine.stop(start + 0.75);

  // degauss hum (on only): a buzzy low tone with a quick wobble
  if (turningOn) {
    const hum = ac.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.setValueAtTime(60, start);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;
    const hg = ac.createGain();
    hg.gain.setValueAtTime(0.0001, start);
    hg.gain.exponentialRampToValueAtTime(0.12, start + 0.04);
    hg.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 18;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(hg.gain);
    hum.connect(lp).connect(hg).connect(ac.destination);
    hum.start(start);
    lfo.start(start);
    hum.stop(start + 0.5);
    lfo.stop(start + 0.5);
  }
}
