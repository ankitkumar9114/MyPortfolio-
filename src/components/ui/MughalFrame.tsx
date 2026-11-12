// Frame for the new loader (frame only, for now): the teal textured
// background (loader-bg-teal.webp) with the painted frame
// (raw-images/Frame.png -> loader-frame.webp, transparent centre) stretched
// to fill the whole viewport.
export default function MughalFrame() {
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-screen frame */}
      <img
        src="/images/loader-frame.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        style={{ objectFit: "fill" }}
      />
    </div>
  );
}
