import type { CaseStudy } from "@/lib/caseStudies";

// Makes the whole case study card clickable: a transparent link laid over the
// card (opens the case study's link in a new tab). Renders nothing when the
// case study has no link. `focusable={false}` for decorative copies (the
// carousel draws each card in many slices).
export default function CaseStudyCardLink({ study, focusable = true }: { study: CaseStudy; focusable?: boolean }) {
  if (!study.link || study.status === "coming-soon") return null;
  return (
    <a
      href={study.link}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={focusable ? undefined : -1}
      aria-label={`View case study: ${study.title}`}
      className="absolute inset-0 z-20 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
    />
  );
}
