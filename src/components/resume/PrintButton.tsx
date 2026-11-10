"use client";

// Opens the print dialog; "Save as PDF" there downloads the resume (the
// page's print styles leave only the framed sheet).
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-[#F7C44C]/70 bg-black/25 px-5 py-2 font-[family-name:var(--font-manrope)] text-[14px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/40"
    >
      Download PDF
    </button>
  );
}
