import type { CSSProperties } from "react";
import type { CaseStudy } from "@/lib/caseStudies";

// Heading, body and "View Case Study →" link for a case study card, as one
// column that runs from `top` down to `bottom` of the card. The heading takes
// up to `titleLines`, the body fills the rest (clamped to `bodyLines`, which
// is what fits when the heading uses all its lines, so it always ends on a
// whole line with "…"), and the link sits at the bottom.
export type CopySizes = {
  box: CSSProperties; // left / top / bottom / width of the column
  topWithTags?: string; // column top when there are tags (tag text lines up with the image top)
  gap: number;
  titleSize: number;
  titleLineHeight: number;
  titleLines: number;
  bodySize: number;
  bodyLines: number;
  bodyLinesWithTags: number; // fewer body lines when a tag row takes space
  tagSize: number;
  linkSize: number;
  center?: boolean;
};

export default function CaseStudyCopy({ study, s }: { study: CaseStudy; s: CopySizes }) {
  const clamp = (n: number): CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });
  return (
    <div className={`absolute flex flex-col ${s.center ? "items-center text-center" : "items-start"}`} style={{ ...s.box, ...(study.tags.length && s.topWithTags ? { top: s.topWithTags } : null), gap: s.gap }}>
      {study.tags.length > 0 && (
        <p
          className="flex w-full shrink-0 items-center overflow-hidden whitespace-nowrap font-[family-name:var(--font-manrope)] font-medium"
          style={{ fontSize: s.tagSize, lineHeight: 1.5, color: "rgba(255,255,255,0.82)" }}
        >
          {study.tags.slice(0, 3).map((t, i) => (
            <span key={`${t}-${i}`} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-block shrink-0 rounded-full"
                  style={{ width: "0.3em", height: "0.3em", margin: "0 0.85em", background: "rgba(255,255,255,0.45)" }}
                />
              )}
              {t}
            </span>
          ))}
        </p>
      )}
      <h3
        className="w-full shrink-0 font-[family-name:var(--font-serif)] font-bold text-white"
        style={{ fontSize: s.titleSize, lineHeight: s.titleLineHeight, overflowWrap: "break-word", ...clamp(s.titleLines) }}
      >
        {study.title}
      </h3>
      <p
        className="w-full min-h-0 font-[family-name:var(--font-manrope)] font-normal"
        style={{ fontSize: s.bodySize, lineHeight: 1.4, color: "#E5E5E5", overflowWrap: "break-word", ...clamp(study.tags.length ? s.bodyLinesWithTags : s.bodyLines) }}
      >
        {study.body}
      </p>
      {study.status === "coming-soon" ? (
        <span
          className="mt-auto inline-flex shrink-0 items-center rounded-full font-[family-name:var(--font-manrope)] font-semibold uppercase text-white"
          style={{
            fontSize: s.linkSize * 0.72,
            lineHeight: 1,
            letterSpacing: "0.08em",
            padding: `${s.linkSize * 0.4}px ${s.linkSize * 0.8}px`,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          Coming soon
        </span>
      ) : (
        // label only: the whole card is the link (see CaseStudyCardLink)
        <span
          aria-hidden="true"
          className="mt-auto inline-flex shrink-0 items-center font-[family-name:var(--font-manrope)] font-semibold text-white"
          style={{ fontSize: s.linkSize, lineHeight: 1.5, gap: s.linkSize * 0.55 }}
        >
          View Case Study
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200 group-hover/card:translate-x-1"
            style={{ width: s.linkSize * 1.15, height: s.linkSize * 1.15 }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </span>
      )}
    </div>
  );
}
