"use client";

import { useEffect, useState } from "react";

// Frame for the new loader (border only, for now): the teal textured
// background (loader-bg-teal.webp) inside a border built from the painted
// pieces in raw-images/border asset.png, cut out into
// public/images/loader-frame/: four corners, a top/bottom strip, a side
// strip and the bottom-centre lotus crest. The strips repeat as mirrored
// tiles (strip + its reflection), so there is never a visible seam.
//
// The pieces were painted at different scales (the corners' band is ~25px
// thick, the strips are 60/56px, the crest's band 35px), so each is scaled
// to the corners' band; the whole frame scales with the window (KC).

const P = "/images/loader-frame/";
// natural sizes of the cut-out pieces (px)
const TL = { w: 398, h: 301 };
const TR = { w: 400, h: 303 };
const BL = { w: 323, h: 183 };
const BR = { w: 334, h: 195 };
const CREST = { w: 607, h: 111, band: 35 };
// strips: strip-top-tile (2826x60) and strip-side-tile (56x1240), each a
// piece plus its reflection, repeated
// the corners' band thickness, which the strips are matched to
const BAND_TOP = 25;
const BAND_BOTTOM = 27;
const BAND_SIDE = 28;
const OVERLAP = 6; // strips run this far under the corners (no gaps from rounding)

export default function MughalFrame() {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const { w, h } = size;
  // corner scale: full size on wide screens, down to 42% on phones
  const kc = Math.min(1, Math.max(0.42, w / 1600));
  const bt = BAND_TOP * kc, bb = BAND_BOTTOM * kc, bs = BAND_SIDE * kc;
  const crestK = bb / CREST.band;
  const img = (src: string, x: number, y: number, pw: number, ph: number, flip = "") => (
    // eslint-disable-next-line @next/next/no-img-element -- decorative frame piece sized by JS
    <img
      key={src + flip}
      src={P + src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute select-none"
      style={{ left: x, top: y, width: pw, height: ph, transform: flip || undefined }}
    />
  );
  const tile = (src: string, x: number, y: number, pw: number, ph: number, bgSize: string, pos: string, flip = "") => (
    <div
      key={src + x + y}
      aria-hidden="true"
      className="absolute"
      style={{ left: x, top: y, width: pw, height: ph, backgroundImage: `url(${P}${src})`, backgroundRepeat: "repeat", backgroundSize: bgSize, backgroundPosition: pos, transform: flip || undefined }}
    />
  );
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#002F2A url('/images/loader-bg-teal.webp') center / cover" }}>
      {/* strips (under the corners) */}
      {tile("strip-top-tile.webp", TL.w * kc - OVERLAP, 0, w - (TL.w + TR.w) * kc + 2 * OVERLAP, bt, `auto ${bt}px`, "center top")}
      {tile("strip-top-tile.webp", BL.w * kc - OVERLAP, h - bb, w - (BL.w + BR.w) * kc + 2 * OVERLAP, bb, `auto ${bb}px`, "center top", "scaleY(-1)")}
      {tile("strip-side-tile.webp", 0, TL.h * kc - OVERLAP, bs, h - (TL.h + BL.h) * kc + 2 * OVERLAP, `${bs}px auto`, "left center")}
      {tile("strip-side-tile.webp", w - bs, TR.h * kc - OVERLAP, bs, h - (TR.h + BR.h) * kc + 2 * OVERLAP, `${bs}px auto`, "left center", "scaleX(-1)")}
      {/* corners */}
      {img("corner-tl.webp", 0, 0, TL.w * kc, TL.h * kc)}
      {img("corner-tr.webp", w - TR.w * kc, 0, TR.w * kc, TR.h * kc)}
      {img("corner-bl.webp", 0, h - BL.h * kc, BL.w * kc, BL.h * kc)}
      {img("corner-br.webp", w - BR.w * kc, h - BR.h * kc, BR.w * kc, BR.h * kc)}
      {/* bottom-centre lotus crest, over the bottom strip */}
      {img("bottom-center.webp", (w - CREST.w * crestK) / 2, h - CREST.h * crestK, CREST.w * crestK, CREST.h * crestK)}
    </div>
  );
}
