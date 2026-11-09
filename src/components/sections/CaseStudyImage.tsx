import type { CaseStudy } from "@/lib/caseStudies";

// Every card's image box uses the desktop card's shape (516.33 x 440.49,
// about 7:6), on all screen sizes.
export const IMAGE_ASPECT = 516.33 / 440.49;

// The case study's image inside the card's image box, with the fit / zoom /
// focus point set in the CRM.
export default function CaseStudyImage({ study }: { study: Pick<CaseStudy, "image" | "imageFit" | "imageZoom" | "imageX" | "imageY"> }) {
  if (!study.image) return null;
  const pos = `${study.imageX}% ${study.imageY}%`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- CRM image (data URL or any host), framed by CSS
    <img
      src={study.image}
      alt=""
      draggable={false}
      className="h-full w-full select-none"
      style={{ objectFit: study.imageFit, objectPosition: pos, transform: `scale(${study.imageZoom})`, transformOrigin: pos }}
    />
  );
}
