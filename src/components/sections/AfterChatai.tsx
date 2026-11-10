"use client";

import { linkedinEmbedUrl, useLinkedinPosts } from "@/lib/linkedinPosts";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSwipeableMarquee } from "@/lib/useSwipeableMarquee";
import { preconnect } from "react-dom";

// The section after the chatai ("My Fridge Magnet Collection"): once the
// mat's pinned scroll ends, the page scrolls on into this deep purple panel.
// Pattern overlay per the Figma settings: raw-images/purple pattern.png
// (306x335) tiled at its native size across and down, 30% opacity,
// "difference" blend over the purple. Content goes on top.
const PURPLE = "#290550";
const PATTERN_SRC = "/images/purple-pattern.webp";
const TILE = { w: 306, h: 335 };
const HEADING_TOP = 160; // px from the section's top
const POSTS_GAP = 110; // heading block -> posts
const POSTS_BOTTOM = 160; // purple below the posts
const POSTS_LOOP_S = 45; // seconds per full loop of the row
const CARD_SCALE = 0.89; // card size vs LinkedIn's 504px embed
const CARD_GAP = 44; // px between cards on screen
const TABLET_CARD_FACTOR = 0.7; // tablet cards are 30% smaller
const PHONE_CARD_FACTOR = 0.65; // phone cards are 35% smaller, so one fits the screen
const PHONE_CARD_GAP = 20; // px between cards on phone
const TABLET_MQ = "(min-width: 425px) and (max-width: 1024px)";
const PHONE_MQ = "(max-width: 424px)";
function subscribeTablet(cb: () => void) {
  const mq = window.matchMedia(TABLET_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function subscribePhone(cb: () => void) {
  const mq = window.matchMedia(PHONE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

// Selected LinkedIn posts, via LinkedIn's "Embed this post" code. To add or
// remove one, edit this list (urn + the height LinkedIn's embed code gives).

// The embeds come from LinkedIn's servers: open those connections early.
const LINKEDIN_ORIGINS = ["https://www.linkedin.com", "https://static.licdn.com", "https://media.licdn.com"];

export default function AfterChatai() {
  const LINKEDIN_POSTS = useLinkedinPosts(); // live from the /admin CMS (Firebase)
  LINKEDIN_ORIGINS.forEach((o) => preconnect(o));
  // Card size + gap, live-tunable in dev (sliders panel, desktop only, shown
  // while this section is on screen). Share the numbers to make them default.
  const [cardScale, setCardScale] = useState(CARD_SCALE);
  const [cardGap, setCardGap] = useState(CARD_GAP);
  const tablet = useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET_MQ).matches, () => false);
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_MQ).matches, () => false);
  const zoom = cardScale * (tablet ? TABLET_CARD_FACTOR : phone ? PHONE_CARD_FACTOR : 1);
  const sectionRef = useRef<HTMLElement>(null);
  const postsTrackRef = useRef<HTMLDivElement>(null);
  // phone: the posts row can also be swiped (it keeps going by itself after)
  useSwipeableMarquee(postsTrackRef, POSTS_LOOP_S);
  const [inView, setInView] = useState(false);
  // The embeds load once the section is within about two screens of the
  // window (not with the page: the loader no longer waits for them), so
  // they're ready by the time anyone scrolls here. Not in the server HTML:
  // the browser would start them before React could catch their load events.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "200% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || process.env.NODE_ENV !== "development") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={sectionRef} aria-label="Next section" className="relative isolate min-h-0 w-full desktop:min-h-screen" style={{ background: PURPLE }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url('${PATTERN_SRC}')`,
          backgroundRepeat: "repeat",
          backgroundSize: `${TILE.w}px ${TILE.h}px`,
          backgroundPosition: "0 0",
          opacity: 0.3,
          mixBlendMode: "difference",
        }}
      />
      {/* Heading (Figma "Frame 44"), same style as "Who is this Ankit?" */}
      {/* phone 80px / tablet 110px from the section's top; desktop HEADING_TOP */}
      <div
        className="relative flex flex-col items-center gap-3 px-4 tablet:gap-[20px] desktop:gap-7 pt-[80px] text-center text-white tablet:pt-[110px] desktop:pt-[var(--heading-top)]"
        style={{ ["--heading-top" as string]: `${HEADING_TOP}px` }}
      >
        <h2
          className="max-w-[755px] uppercase"
          style={{ fontFamily: "var(--font-arvo)", fontWeight: 700, fontSize: "clamp(36px, 5vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          Place Where{" "}
          {/* the standalone "I", in a red gradient (Figma: #C12A39 -> #4B070E) */}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #C12A39 0%, #4B070E 100%)", WebkitBackgroundClip: "text" }}
          >
            I
          </span>{" "}
          {/* tablet: two lines, "Place Where I" / "Dump My Ideas" */}
          <br className="hidden tablet:block desktop:hidden" />
          Dump My Ideas
        </h2>
        {/* tablet: same line length as every other section divider (10vw) */}
        <div className="flex w-auto max-w-[637px] items-center gap-4 sm:gap-12 tablet:w-auto tablet:gap-[48px] desktop:w-full desktop:gap-12">
          <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:bg-[#D3D2D2] tablet:w-[10vw] tablet:flex-none desktop:flex-1" />
          <span
            className="shrink-0"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "clamp(18px, 2vw, 28px)", lineHeight: 1.05, letterSpacing: "0.04em" }}
          >
            my post
          </span>
          <span aria-hidden="true" className="h-[2px] min-w-0 w-[12vw] flex-none bg-white tablet:w-[10vw] tablet:flex-none desktop:flex-1" />
        </div>
      </div>

      {/* Posts: one row of LinkedIn embeds scrolling sideways in a loop
          (two identical halves sliding by -50%, see .animate-marquee); hovering
          a CARD (not the empty row around them) pauses it, see .posts-marquee. Full-bleed. */}
      <div
        // phone 48px / tablet 72px below "my post" instead of POSTS_GAP; tablet 140px of
        // purple below the cards (the section isn't held at full screen
        // height there) instead of POSTS_BOTTOM
        className="posts-marquee relative mt-[48px] w-full overflow-hidden pb-[60px] tablet:mt-[72px] tablet:pb-[140px] desktop:mt-[var(--posts-gap)] desktop:pb-[var(--posts-bottom)]"
        style={{ ["--posts-gap" as string]: `${POSTS_GAP}px`, ["--posts-bottom" as string]: `${POSTS_BOTTOM}px` }}
      >
        <div ref={postsTrackRef} className="animate-marquee flex w-max items-start" style={{ animationDuration: `${POSTS_LOOP_S}s` }}>
          {[0, 1].map((copy) =>
            LINKEDIN_POSTS.map((post) => {
              const card = (
              <div
                key={`${copy}-${post.urn}`}
                // the second copy only completes the loop: hidden from
                // screen readers and the tab order
                aria-hidden={copy === 1 || undefined}
                className="post-card relative w-[504px] shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                // smaller cards: the embed keeps LinkedIn's 504px layout and
                // the whole card is scaled down (narrowing it instead would
                // rewrap the post and clip it at its fixed height). Phone
                // scales with a transform instead of `zoom`: iOS Safari
                // zooms an iframe's page a second time, leaving the post
                // shrunk inside an oversized white card.
                // margin is inside the zoom, so divide to keep CARD_GAP on screen
                style={phone ? { transform: `scale(${zoom})`, transformOrigin: "0 0" } : { zoom, marginRight: cardGap / zoom }}
              >
                {/* The embed is display-only (pointer-events: none): an iframe
                    under the pointer swallows wheel and mouse events, which
                    broke smooth scrolling (Lenis) and froze the custom cursor
                    while hovering a post. The link layer on top keeps those
                    events on the page; clicking opens the post on LinkedIn. */}
                {/* soft placeholder until the post has loaded */}
                {!loaded[`${copy}-${post.urn}`] && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-[#f3f2ef]" />}
                <iframe
                  src={near ? linkedinEmbedUrl(post.urn) : undefined}
                  title="LinkedIn post"
                  width="100%"
                  height={post.height}
                  tabIndex={-1}
                  onLoad={() => near && setLoaded((m) => ({ ...m, [`${copy}-${post.urn}`]: true }))}
                  data-loaded={loaded[`${copy}-${post.urn}`] ? "1" : undefined}
                  className="pointer-events-none relative block w-full border-0"
                  // Chrome on iOS adds its own attribute to iframes before
                  // React loads (__gcrchildframeremotetoken); ignore that here
                  suppressHydrationWarning
                />
                <a
                  href={`https://www.linkedin.com/feed/update/${post.urn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={copy === 1 ? -1 : undefined}
                  aria-label="Open this post on LinkedIn"
                  className="absolute inset-0 z-10 cursor-pointer rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  // some browser extensions style these links (an inline border)
                  // before React loads; ignore that mismatch on this element
                  suppressHydrationWarning
                />
              </div>
              );
              // phone: a box at the scaled size holds the transformed card
              return phone ? (
                <div key={`${copy}-${post.urn}`} className="shrink-0" style={{ width: 504 * zoom, height: post.height * zoom, marginRight: PHONE_CARD_GAP }}>
                  {card}
                </div>
              ) : (
                card
              );
            }),
          )}
        </div>
      </div>
      {process.env.NODE_ENV === "development" && inView && (
        <PostsTuner scale={cardScale} gap={cardGap} onScale={setCardScale} onGap={setCardGap} />
      )}
    </section>
  );
}

// Dev-only sliders (desktop only), bottom-left while the posts are on screen.
function PostsTuner({ scale, gap, onScale, onGap }: { scale: number; gap: number; onScale: (v: number) => void; onGap: (v: number) => void }) {
  const [open, setOpen] = useState(false); // starts collapsed to the "Posts" pill
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-20 z-[2000] hidden rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg desktop:block"
        style={{ cursor: "pointer" }}
      >
        Posts
      </button>
    );
  }
  return (
    <div className="fixed bottom-4 left-4 z-[2000] hidden w-[240px] rounded-xl bg-black/85 p-4 text-xs text-white shadow-xl backdrop-blur desktop:block">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Posts (dev only)</span>
        <button type="button" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" style={{ cursor: "pointer" }}>
          Hide
        </button>
      </div>
      <label className="mb-1 flex justify-between">
        <span>Card size</span>
        <span className="tabular-nums">
          {Math.round(scale * 100)}% · {Math.round(504 * scale)}px
        </span>
      </label>
      <input type="range" min={0.4} max={1.3} step={0.005} value={scale} onChange={(e) => onScale(Number(e.target.value))} className="mb-3 w-full" style={{ cursor: "pointer" }} />
      <label className="mb-1 flex justify-between">
        <span>Gap</span>
        <span className="tabular-nums">{gap}px</span>
      </label>
      <input type="range" min={0} max={120} step={1} value={gap} onChange={(e) => onGap(Number(e.target.value))} className="w-full" style={{ cursor: "pointer" }} />
    </div>
  );
}
