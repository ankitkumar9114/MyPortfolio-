import type { Metadata } from "next";
import { Arvo, Bricolage_Grotesque, Caveat, Inter, Manrope, Merriweather, Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

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

// Handwriting for the crayon "controller" scribble on the TV.
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

// Impact-in-Numbers' colored stat/tag text ("IQOL", "ACN", "Vault") per
// Figma's font-family: 'Newsreader', font-weight: 800 — not used
// anywhere else on the page yet, so it's its own font rather than
// reusing/renaming an existing variable.
const newsreaderFont = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Your Name — Portfolio",
  description: "Designer & developer crafting immersive digital experiences.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning (this element and <body> only, not their
    // children): browser extensions add attributes here before React loads
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} ${serifFont.variable} ${arvoFont.variable} ${caveatFont.variable} ${manropeFont.variable} ${newsreaderFont.variable} h-full antialiased`}
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
            onto every <div> before React loads, which React then reports as
            a hydration mismatch. This strips them as they're added (before
            hydration runs), so the page matches what the server sent. */}
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`
            (function () {
              var attrs = ["bis_skin_checked", "bis_register", "__processed_"];
              var sel = attrs.map(function (a) { return "[" + a + "]"; }).join(",");
              function clean(el) {
                if (!el || !el.removeAttribute) return;
                for (var i = 0; i < attrs.length; i++) if (el.hasAttribute(attrs[i])) el.removeAttribute(attrs[i]);
              }
              function cleanTree(root) {
                clean(root);
                if (root && root.querySelectorAll) root.querySelectorAll(sel).forEach(clean);
              }
              cleanTree(document.documentElement);
              new MutationObserver(function (records) {
                records.forEach(function (r) {
                  if (r.type === "attributes") clean(r.target);
                  else r.addedNodes.forEach(cleanTree);
                });
              }).observe(document.documentElement, { attributes: true, attributeFilter: attrs, childList: true, subtree: true });
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
