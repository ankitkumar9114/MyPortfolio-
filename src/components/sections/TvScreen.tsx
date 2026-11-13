"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { TvRemote } from "./tvPower";
import { TV_PLACEHOLDER_DESCRIPTION, TV_PLACEHOLDER_TITLE, playableVideoUrl, useTvChannels } from "@/lib/tvChannels";

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------
// Channels come from the CMS (/admin → Vibe Coding channel; lib/tvChannels.ts):
// each one plays its video, or shows its background + label when it has none.
// Previous/Next cycle through them in order, wrapping around, and the channel
// number on screen is the position in the list.

const VOLUME_STEPS = 10;
const DEFAULT_VOLUME = 6;
const OSD_MS = 2200; // how long a channel/volume/play readout stays up
const STATIC_MS = 450; // channel-change static burst
const INFO_MS = 6000; // how long the set-top-box info banner stays up
const FADE_S = 1.5; // sound fade as the TV scrolls out of / into view

type Osd = { kind: "channel" | "volume" | "play" | "pause"; id: number } | null;

// ---------------------------------------------------------------------------
// State + remote actions
// ---------------------------------------------------------------------------
export function useTvState() {
  const [on, setOn] = useState(false);
  const [channel, setChannel] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [osd, setOsd] = useState<Osd>(null);
  const [staticId, setStaticId] = useState(0); // bumps on every channel change
  const [info, setInfo] = useState<number | null>(null); // info banner, keyed per showing

  // The channel readout brings up the info banner with it; any other readout
  // (volume, play/pause) clears the banner so the two don't overlap.
  const show = useCallback((kind: NonNullable<Osd>["kind"]) => {
    const id = Date.now();
    setOsd({ kind, id });
    setInfo(kind === "channel" ? id : null);
  }, []);

  useEffect(() => {
    if (info === null) return;
    const t = setTimeout(() => setInfo(null), INFO_MS);
    return () => clearTimeout(t);
  }, [info]);

  // Auto-hide every readout except a standing PAUSE.
  useEffect(() => {
    if (!osd || osd.kind === "pause") return;
    const t = setTimeout(() => setOsd(null), OSD_MS);
    return () => clearTimeout(t);
  }, [osd]);

  // Switch the set on/off from outside (e.g. scroll), with the same channel
  // flash as the power button.
  const setPower = useCallback(
    (next: boolean) => {
      setOn(next);
      // Real sets flash the channel number once the picture comes up.
      if (next) setTimeout(() => show("channel"), 950);
      else {
        setOsd(null);
        setInfo(null);
      }
    },
    [show],
  );

  const count = useTvChannels().length;
  const actions: Omit<TvRemote, "on" | "autoPress"> = {
    toggle: () => setPower(!on),
    prev: () => {
      if (!on) return;
      setChannel((c) => (c - 1 + count) % count);
      setPlaying(true);
      setStaticId((n) => n + 1);
      show("channel");
    },
    next: () => {
      if (!on) return;
      setChannel((c) => (c + 1) % count);
      setPlaying(true);
      setStaticId((n) => n + 1);
      show("channel");
    },
    playPause: () => {
      if (!on) return;
      show(playing ? "pause" : "play");
      setPlaying(!playing);
    },
    volUp: () => {
      if (!on) return;
      setVolume((v) => Math.min(VOLUME_STEPS, v + 1));
      show("volume");
    },
    volDown: () => {
      if (!on) return;
      setVolume((v) => Math.max(0, v - 1));
      show("volume");
    },
  };
  const remote: TvRemote = { on, autoPress: 0, ...actions };

  return { remote, setPower, on, channel, playing, volume, osd, staticId, info };
}

// ---------------------------------------------------------------------------
// Picture: the active channel, plus static, on-screen display and scanlines
// ---------------------------------------------------------------------------
const SCANLINES_BG =
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 3px)";

// Green, glowing, monospaced readout like a 90s TV/VCR menu. Sized in
// container-query units so it scales with the screen at any zoom level.
const OSD_TEXT: CSSProperties = {
  fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
  fontWeight: 700,
  color: "#5dff6a",
  letterSpacing: "0.08em",
  textShadow: "0 0 0.35cqw rgba(93,255,106,0.9), 0 0 1.2cqw rgba(93,255,106,0.45), 0.25cqw 0.25cqw 0 rgba(0,40,0,0.6)",
  lineHeight: 1,
};

export function TvPicture({
  on,
  channel,
  playing,
  volume,
  osd,
  staticId,
  info,
}: {
  on: boolean;
  channel: number;
  playing: boolean;
  volume: number;
  osd: Osd;
  staticId: number;
  info: number | null;
}) {
  const reduceMotion = useReducedMotion();
  const channels = useTvChannels();
  const ch = channels[channel % channels.length];

  return (
    <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
      {/* Channel content. Keyed by channel so a switch remounts it, and a
          quick vertical roll on mount mimics a set losing then catching
          the new signal's sync. */}
      <div key={`channel-${channel}`} className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          data-tv-video-frame=""
          initial={reduceMotion ? false : { y: "-12%", filter: "brightness(1.6) contrast(1.3)" }}
          animate={{ y: "0%", filter: "brightness(1) contrast(1)" }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1], delay: STATIC_MS / 1000 - 0.15 }}
          style={{ background: ch.video ? "#000" : ch.background }}
        >
          {ch.video && <ChannelVideo src={playableVideoUrl(ch.video)} on={on} playing={playing} volume={volume} />}
          {!ch.video && ch.label && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ ...OSD_TEXT, color: "#fff", fontSize: "4.8cqw", textShadow: "0 0 0.6cqw rgba(255,255,255,0.6)" }}>
                {ch.label}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {on && !reduceMotion && <StaticBurst key={`static-${staticId}`} active={staticId > 0} />}

      <InfoBanner showing={on ? info : null} number={channel + 1} title={ch.title} description={ch.description} />

      <div className="absolute inset-0" style={{ background: SCANLINES_BG }} />

      <OsdLayer osd={osd} channel={channel} volume={volume} />
    </div>
  );
}

// A proxied Drive video, downloaded once as a whole (one plain request, so
// the CDN can cache it; see /api/drive-video) and played from memory, where
// seeking and looping need no more requests. Shared across channel switches.
// Falls back to streaming the URL if the download fails. Only starts once
// the TV is switched on (`enabled`), so loading the page never pulls a video.
const videoBlobs = new Map<string, Promise<string>>();
function useCachedVideoSrc(src: string, enabled: boolean) {
  const proxied = src.startsWith("/api/drive-video");
  const [ready, setReady] = useState<{ for: string; url: string } | null>(null);
  useEffect(() => {
    if (!proxied || !enabled) return;
    let alive = true;
    let p = videoBlobs.get(src);
    if (!p) {
      p = fetch(src)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => URL.createObjectURL(b));
      p.catch(() => videoBlobs.delete(src));
      videoBlobs.set(src, p);
    }
    p.then(
      (url) => alive && setReady({ for: src, url }),
      () => alive && setReady({ for: src, url: src }),
    );
    return () => {
      alive = false;
    };
  }, [src, proxied, enabled]);
  if (!proxied) return src;
  return ready?.for === src ? ready.url : undefined;
}

function ChannelVideo({ src: rawSrc, on, playing, volume }: { src: string; on: boolean; playing: boolean; volume: number }) {
  const src = useCachedVideoSrc(rawSrc, on);
  const ref = useRef<HTMLVideoElement>(null);
  // the video whose first picture is showing; until then the set is
  // "tuning" (snow and a blinking readout) instead of a black screen
  const [shownSrc, setShownSrc] = useState<string | null>(null);
  const tuning = on && (!src || shownSrc !== src);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (on && playing) v.play().catch(() => {});
    else v.pause();
  }, [on, playing, src]);
  // Volume = the set's volume × how much of the screen is in view, eased so
  // the sound fades out slowly as the TV scrolls off the page (and back in
  // when it returns) instead of cutting.
  const level = useRef(volume / VOLUME_STEPS);
  const gain = useRef(1); // current, eased
  const target = useRef(1); // from the screen's visibility
  useEffect(() => {
    level.current = volume / VOLUME_STEPS;
    const v = ref.current;
    if (!v) return;
    v.volume = level.current * gain.current;
    // Starts muted (so autoplay is allowed); any volume button press is a
    // user gesture, so unmuting from then on is fine.
    v.muted = volume === 0;
  }, [volume]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      // close ~95% of the gap in FADE_S seconds
      gain.current += (target.current - gain.current) * (1 - Math.exp((-3 * dt) / FADE_S));
      if (Math.abs(target.current - gain.current) < 0.005) gain.current = target.current;
      v.volume = Math.min(1, Math.max(0, level.current * gain.current));
      raf = gain.current === target.current ? 0 : requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        // full volume while at least half the screen is visible, then down
        // to silence as the rest leaves the viewport
        target.current = entry.isIntersecting ? Math.min(1, entry.intersectionRatio * 2) : 0;
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(step);
        }
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  const showing = () => {
    const v = ref.current;
    if (v && src && v.readyState >= 2) setShownSrc(src);
  };
  return (
    <>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={showing}
        onPlaying={showing}
        onCanPlay={showing}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {tuning && <TuningScreen />}
    </>
  );
}

// An old set finding the signal, while the video loads: dim analog snow, a
// slow rolling bar, and a blinking "TUNING" readout in the on-screen-display
// green. Cheap: a small canvas redrawn every other frame.
function TuningScreen() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const img = ctx.createImageData(c.width, c.height);
    let raf = 0, frame = 0;
    const draw = () => {
      if (frame++ % 2 === 0) {
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 40 + Math.random() * 150;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      <canvas ref={ref} width={120} height={75} className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated", opacity: 0.38 }} />
      {!reduceMotion && <div className="tv-roll absolute inset-x-0 h-[22%]" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.10), transparent)" }} />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1.4cqw]">
        <span className={reduceMotion ? "" : "tv-blink"} style={{ ...OSD_TEXT, fontSize: "4.2cqw" }}>
          TUNING…
        </span>
        <span style={{ ...OSD_TEXT, fontSize: "2.1cqw", opacity: 0.8 }}>PLEASE WAIT</span>
      </div>
    </div>
  );
}

// Analog snow: a tiny canvas of random grey pixels, redrawn every frame and
// stretched over the screen (pixelated), shown briefly on channel change.
function StaticBurst({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(active);
  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const img = ctx.createImageData(c.width, c.height);
    let raf = 0;
    const draw = () => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    const t = setTimeout(() => setVisible(false), STATIC_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [active]);
  if (!active || !visible) return null;
  return (
    <canvas
      ref={ref}
      width={160}
      height={100}
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated", opacity: 0.9 }}
    />
  );
}

// Capital-letter height of the readout's monospace font, as a fraction of
// its font size (measured in the browser).
const CAP_HEIGHT_EM = 0.73;

// Play triangle / pause bars, colored and glowing like the readout text.
function OsdIcon({ kind }: { kind: "play" | "pause" }) {
  const glow = "drop-shadow(0 0 0.35cqw rgba(93,255,106,0.9)) drop-shadow(0.25cqw 0.25cqw 0 rgba(0,40,0,0.6))";
  if (kind === "play") {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0"
        style={{ width: `${CAP_HEIGHT_EM * 0.9}em`, height: `${CAP_HEIGHT_EM}em`, filter: glow }}
      >
        <span className="block h-full w-full" style={{ background: "#5dff6a", clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0"
      style={{ height: `${CAP_HEIGHT_EM}em`, gap: `${CAP_HEIGHT_EM * 0.22}em`, filter: glow }}
    >
      <span style={{ width: `${CAP_HEIGHT_EM * 0.26}em`, background: "#5dff6a" }} />
      <span style={{ width: `${CAP_HEIGHT_EM * 0.26}em`, background: "#5dff6a" }} />
    </span>
  );
}

function OsdLayer({ osd, channel, volume }: { osd: Osd; channel: number; volume: number }) {
  return (
    <AnimatePresence>
      {osd && (
        <motion.div
          key={osd.kind + osd.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
        >
          {osd.kind === "channel" && (
            <span className="absolute" style={{ ...OSD_TEXT, right: "6%", top: "8%", fontSize: "4cqw" }}>
              CH {String(channel + 1).padStart(2, "0")}
            </span>
          )}
          {(osd.kind === "play" || osd.kind === "pause") && (
            // Icon drawn as a shape (not a text glyph) sized to the font's
            // capital height and sitting on the same baseline as the word,
            // so the two line up exactly; small fixed gap between them.
            <span
              className="absolute flex items-baseline"
              style={{ ...OSD_TEXT, left: "6%", top: "8%", fontSize: "4cqw", gap: "0.75cqw" }}
            >
              <OsdIcon kind={osd.kind} />
              <span>{osd.kind === "play" ? "PLAY" : "PAUSE"}</span>
            </span>
          )}
          {osd.kind === "volume" && (
            <div className="absolute flex items-center" style={{ left: "8%", right: "8%", bottom: "10%", gap: "1.6cqw" }}>
              <span style={{ ...OSD_TEXT, fontSize: "3.2cqw" }}>VOLUME</span>
              <div className="flex flex-1 items-end" style={{ gap: "0.75cqw", height: "3.2cqw" }}>
                {Array.from({ length: VOLUME_STEPS }).map((_, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    style={{
                      height: "100%",
                      background: i < volume ? "#5dff6a" : "rgba(93,255,106,0.18)",
                      boxShadow: i < volume ? "0 0 0.6cqw rgba(93,255,106,0.8)" : "none",
                    }}
                  />
                ))}
              </div>
              <span style={{ ...OSD_TEXT, fontSize: "3.2cqw", minWidth: "3.6cqw", textAlign: "right" }}>{volume}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Info banner: a "now showing" panel along the bottom of the picture, up for
// a few seconds whenever a channel is tuned in. The same glowing monospace
// readout as the volume/channel OSD, but in white on a dark panel, with an
// outline whose top edge steps down on
// a slant partway across:
//   ┌────────────────────────────┐
//   │ 05  VIDEO TITLE             ╲______________
//   │ Video description            📅 27 Oct 2026 │
//   │                              🕒 12:00       │
//   └─────────────────────────────────────────────┘
// Drawn under the scanlines so it reads as part of the broadcast.
// ---------------------------------------------------------------------------
// Panel geometry in cqw (the screen's width = 100cqw), so the SVG outline
// can use the same numbers as its viewBox.
const BANNER_W = 84; // matches the volume readout's 8% side insets
const BANNER_H = 12;
const BANNER_SPLIT = BANNER_W * 0.68; // where the top edge starts to slant
const BANNER_SLANT = 2.4; // horizontal run of the slant
const BANNER_STEP = 3; // how far the right section's top sits lower
const BANNER_POINTS = (inset: number) =>
  [
    [inset, inset],
    [BANNER_SPLIT, inset],
    [BANNER_SPLIT + BANNER_SLANT, BANNER_STEP + inset],
    [BANNER_W - inset, BANNER_STEP + inset],
    [BANNER_W - inset, BANNER_H - inset],
    [inset, BANNER_H - inset],
  ]
    .map((xy) => xy.join(","))
    .join(" ");
const BANNER_INK = "#ffffff";
const BANNER_GLOW = "drop-shadow(0 0 0.35cqw rgba(255,255,255,0.7))";
const BANNER_TEXT: CSSProperties = {
  ...OSD_TEXT,
  color: BANNER_INK,
  textShadow: "0 0 0.35cqw rgba(255,255,255,0.75), 0 0 1.2cqw rgba(255,255,255,0.3), 0.25cqw 0.25cqw 0 rgba(0,0,0,0.6)",
};
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const pad = (n: number) => String(n).padStart(2, "0");

// The current time, ticking every second while `active`.
function useNow(active: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // catch up straight away when shown
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [active]);
  return now;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="shrink-0" style={{ width: "1em", height: "1em", filter: BANNER_GLOW }} fill="none" stroke={BANNER_INK} strokeWidth="1.8">
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="shrink-0" style={{ width: "1em", height: "1em", filter: BANNER_GLOW }} fill="none" stroke={BANNER_INK} strokeWidth="1.8">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Also used by the CMS (/admin → Vibe Coding channel) as a live preview.
export function InfoBanner({
  showing,
  number,
  title,
  description,
}: {
  showing: number | null;
  number: number;
  title: string;
  description: string;
}) {
  const now = useNow(showing !== null);
  const date = `${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <AnimatePresence>
      {showing !== null && (
        <motion.div
          key={showing}
          className="absolute flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
          style={{ left: "8%", width: `${BANNER_W}cqw`, height: `${BANNER_H}cqw`, bottom: "10%" }}
        >
          <svg
            viewBox={`0 0 ${BANNER_W} ${BANNER_H}`}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
            style={{ filter: BANNER_GLOW }}
          >
            <polygon points={BANNER_POINTS(0)} fill="rgba(0, 0, 0, 0.62)" />
            <polygon points={BANNER_POINTS(0.15)} fill="none" stroke={BANNER_INK} strokeWidth="0.3" strokeLinejoin="round" />
          </svg>

          <div
            className="relative flex min-w-0 flex-col justify-center"
            style={{ width: `${BANNER_SPLIT}cqw`, padding: "0 2cqw", gap: "1cqw" }}
          >
            <div className="flex items-baseline" style={{ ...BANNER_TEXT, fontSize: "2.6cqw", gap: "1.8cqw" }}>
              <span>{pad(number)}</span>
              <span className="min-w-0 truncate uppercase">{title || TV_PLACEHOLDER_TITLE}</span>
            </div>
            <p
              className="line-clamp-2"
              style={{ ...BANNER_TEXT, fontSize: "1.75cqw", fontWeight: 500, letterSpacing: "0.03em", lineHeight: 1.4, opacity: 0.85 }}
            >
              {description || TV_PLACEHOLDER_DESCRIPTION}
            </p>
          </div>

          <div
            className="relative flex flex-1 flex-col items-start justify-center"
            style={{
              ...BANNER_TEXT,
              fontSize: "1.9cqw",
              paddingTop: `${BANNER_STEP}cqw`,
              paddingLeft: `${BANNER_SLANT + 2}cqw`,
              paddingRight: "2cqw",
              gap: "1.1cqw",
            }}
          >
            <span className="flex items-center whitespace-nowrap" style={{ gap: "1cqw" }}>
              <CalendarIcon />
              {date}
            </span>
            <span className="flex items-center whitespace-nowrap" style={{ gap: "1cqw" }}>
              <ClockIcon />
              {time}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
