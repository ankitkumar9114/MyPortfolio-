// Downloads the resume as a PDF file (/api/resume-pdf: real text in the
// site's fonts and the hero border, ~150KB), generated from the same CMS
// content as the page.
export default function PrintButton() {
  return (
    <a
      href="/api/resume-pdf"
      download
      className="rounded-full border border-[#F7C44C]/70 bg-black/25 px-5 py-2 font-[family-name:var(--font-manrope)] text-[14px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/40"
    >
      Download PDF
    </a>
  );
}
