// "Product I Build" — the fourth section of the page, right after
// "Impact in Numbers". This first pass only builds the heading + divider
// row ("Frame 59"/"Frame 42" in Figma) — the same structural pattern
// ProblemsSolved.tsx's own heading already uses (see that file's
// comments for the full reasoning behind the clamp()-based responsive
// widths and the explicit desktop: font-size tier), just with this
// section's own text and its own slightly wider Figma box (684px vs
// 659px — "PRODUCT I BUILD" fits Figma's spec on a single line at 72px,
// unlike "Problems Which I Solved" which wraps to two, so the box is a
// little wider to fit it). No content below the heading has been specced
// yet, so it isn't built here.
//
// Figma's own dev-mode export for both the heading and divider text
// reused "Problems Which I solved"/"featured works" as the literal layer
// names AND copied their old CSS values verbatim — clearly a duplicated
// component instance's leftover content, not this section's own real
// copy (the same kind of stale-placeholder-text export this page's stat
// cards already ran into). The reference screenshot's actual text —
// "PRODUCT I BUILD" and "vibe coading" — is what's used below. "vibe
// coading" is reproduced exactly as shown (unusual spelling and all)
// rather than "corrected" to "coding", on the assumption it's a
// deliberate wordmark spelling rather than a typo to silently fix.
//
// 180px gap from ImpactInNumbers above, per request — applied uniformly
// across all breakpoints (no per-device value was given this time,
// unlike some earlier spacing requests) via a plain margin-top on this
// section's own wrapper, same "one explicit margin, not folded into
// anything else" approach used for every other inter-section gap on
// this page.
import TvControls from "./TvControls";
import TvOnCabinet from "./TvOnCabinet";

const I_GRADIENT = "radial-gradient(circle, #C12A39 0%, #4B070E 100%)";

export default function ProductIBuild() {
  return (
    // 180px below the Impact in Numbers cards on desktop, 100px on tablet;
    // on phone 80px, to the pink "Who is this Ankit?" panel
    <section className="relative mt-[80px] w-full tablet:mt-[100px] desktop:mt-[180px]">
      {/* hidden on phone for now: "Product I Build" isn't shown there */}
      <div className="hidden flex-col items-center tablet:flex">
        {/* Same clamp()-based responsive-width technique as
            ProblemsSolved.tsx's own heading block (see that file's
            comments for why: a bare tablet:w-[684px] would jump straight
            to that fixed width the instant the tablet breakpoint kicks
            in, overflowing a 425px-wide screen). 66.8vw is 684px's own
            share of 1024px (tablet's upper bound), floored at 340px
            (matching the phone value, same floor ProblemsSolved uses). */}
        <div className="flex w-[min(90vw,340px)] flex-col items-center gap-3 tablet:w-[clamp(340px,66.8vw,684px)] tablet:gap-[20px] desktop:gap-[28px]">
          <h2
            className="w-full text-center font-[family-name:var(--font-arvo)] font-bold uppercase text-[#29292A] text-[36px] tablet:text-[48px] desktop:text-[72px]"
            style={{
              lineHeight: "105%",
              letterSpacing: "-0.02em",
            }}
          >
            Product{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: I_GRADIENT }}
            >
              I
            </span>{" "}
            Build
          </h2>

          {/* Frame 42's own width (637px) is identical to
              ProblemsSolved's own divider row, so this reuses that exact
              same clamp() expression. */}
          <div className="flex w-auto flex-row items-center gap-4 tablet:w-auto tablet:gap-[48px] desktop:w-[clamp(300px,62.2vw,637px)]">
            <div className="h-[2px] w-[12vw] flex-none tablet:w-[10vw] tablet:flex-none desktop:flex-1" style={{ background: "#616161" }} />
            <p
              className="whitespace-nowrap font-[family-name:var(--font-serif)] font-bold text-[16px] tablet:text-[20px] desktop:text-[28px]"
              style={{ lineHeight: "105%", letterSpacing: "0.04em", color: "#353232" }}
            >
              vibe coading
            </p>
            <div className="h-[2px] w-[12vw] flex-none tablet:w-[10vw] tablet:flex-none desktop:flex-1" style={{ background: "#616161" }} />
          </div>
        </div>
      </div>

      {/* Retro TV on a lace-covered cabinet with a rotating star behind it.
          80px from the heading block to the star's top tips, per request
          (32px on tablet) — TvOnCabinet reserves the star's own headroom
          above the TV, so this gap stays the same whatever size the star or
          screen is. 16px side gutter. Sizing/positioning lives in
          TvOnCabinet.tsx, which also has a dev-only live tuner. */}
      {/* overflow: clip (not hidden — hidden would make this a scroll
          container and break the sticky zoom pin inside) keeps the zoomed
          TV scene from spilling past the page edges or below this row. */}
      <div className="mt-0 flex justify-center overflow-clip px-4 tablet:mt-[32px] desktop:mt-[80px]">
        <TvOnCabinet>
          <TvControls />
        </TvOnCabinet>
      </div>
    </section>
  );
}
