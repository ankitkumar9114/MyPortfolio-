import type { Metadata } from "next";
import { Arvo, Caveat, Manrope, Merriweather } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Four typefaces only: Arvo for headings, Merriweather for sub-headings,
// Manrope for body text (also the page's default font, see globals.css) and
// Caveat for the handwritten bits.
const serifFont = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  // 800 added for the Impact-in-Numbers stat cards' heading ("Lead Full
  // CRM Design" etc, per Figma's font-weight: 800) — Merriweather only
  // ships 300/400/700/900 as static weights, no 800; 900 is the closest
  // available and visually indistinguishable from a spec'd 800 at these
  // sizes, so used as a stand-in rather than the (wrong) 700 already
  // loaded for other text on the page.
  weight: ["400", "700", "900"],
});

// Handwriting: the crayon "controller" scribble on the TV, the shelf label
// and the "click"/"hover" hints.
const caveatFont = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

const arvoFont = Arvo({
  variable: "--font-arvo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const manropeFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  // 500 added for the Impact-in-Numbers stat cards' subtitle ("for
  // internal Team" etc, per Figma's font-weight: 500).
  // 600 added for the "Who is this Ankit?" intro paragraph (Figma: 600).
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ankit's Portfolio",
  description: "Ankit Kumar Tiwari — UI/UX and product designer designing and building products on which startups bet.",
  openGraph: {
    title: "Ankit's Portfolio",
    description: "Ankit Kumar Tiwari — UI/UX and product designer designing and building products on which startups bet.",
    url: "https://www.ankitux.co.in",
    siteName: "Ankit's Portfolio",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning (this element and <body> only, not their
    // children): browser extensions add attributes here before React loads
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serifFont.variable} ${arvoFont.variable} ${caveatFont.variable} ${manropeFont.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        {/* Runs before Next's own code / hydration (strategy=
            "beforeInteractive"), injected straight into <head> regardless
            of where it sits in this tree — the earliest a script can
            possibly run. Needed at THIS point, not from a useEffect in
            SmoothScroll.tsx (where an earlier pass put it): browsers
            restore the previous scroll position on a plain reload by
            default (history.scrollRestoration === "auto"), and that
            restoration already happens before React even hydrates — a
            useEffect-based fix corrects window.scrollY a few dozen ms
            later, which is technically "fixed" by the time anything
            reads it, but leaves a brief real flash of the page still
            showing scrolled-down content right after the reload, which
            reads as "still not starting from the top." Running this
            synchronously before any paint removes that flash entirely. */}
        <Script id="reset-scroll-restoration" strategy="beforeInteractive">
          {`
            if ("scrollRestoration" in window.history) {
              window.history.scrollRestoration = "manual";
            }
            window.scrollTo(0, 0);
          `}
        </Script>
        {/* Some browser extensions stamp attributes such as bis_skin_checked
            onto elements (bis_skin_checked on <div>s, bis_skin_element on links) before React loads, which React then reports as
            a hydration mismatch. This strips them as they're added (before
            hydration runs), so the page matches what the server sent. */}
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`
            (function () {
              // any attribute these extensions stamp on elements: bis_skin_checked,
              // bis_skin_element, bis_register, __processed_…
              function isExtensionAttr(name) {
                return name.indexOf("bis_") === 0 || name.indexOf("__processed_") === 0;
              }
              function clean(el) {
                if (!el || !el.attributes) return;
                for (var i = el.attributes.length - 1; i >= 0; i--) {
                  var n = el.attributes[i].name;
                  if (isExtensionAttr(n)) el.removeAttribute(n);
                }
              }
              function cleanTree(root) {
                clean(root);
                if (root && root.querySelectorAll) root.querySelectorAll("*").forEach(clean);
              }
              cleanTree(document.documentElement);
              var mo = new MutationObserver(function (records) {
                records.forEach(function (r) {
                  if (r.type === "attributes") {
                    if (isExtensionAttr(r.attributeName)) r.target.removeAttribute(r.attributeName);
                  } else r.addedNodes.forEach(cleanTree);
                });
              });
              mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
              // only needed until React has hydrated the page
              window.addEventListener("load", function () {
                setTimeout(function () { mo.disconnect(); }, 4000);
              });
              // Errors thrown by browser extensions' own code (e.g. a failed
              // fetch inside chrome-extension://…) aren't the site's: stop them
              // here, before the Next.js error overlay's listeners see them.
              function fromExtension(err) {
                var s = (err && (err.stack || String(err))) || "";
                return /(chrome|moz|safari(-web)?)-extension:\\/\\//.test(s);
              }
              window.addEventListener("unhandledrejection", function (e) {
                if (fromExtension(e.reason)) { e.stopImmediatePropagation(); e.preventDefault(); }
              });
              window.addEventListener("error", function (e) {
                if (fromExtension(e.error) || /(chrome|moz|safari(-web)?)-extension:\\/\\//.test(e.filename || "")) {
                  e.stopImmediatePropagation(); e.preventDefault();
                }
              });
            })();
          `}
        </Script>
        {/* The portfolio's own chrome (preloader, cursor, header, smooth
            scroll) lives in app/(site)/layout.tsx so /admin doesn't get it. */}
        {children}
      </body>
    </html>
  );
}
