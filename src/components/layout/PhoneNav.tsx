"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getLenis } from "@/lib/lenisInstance";
import { useContactDetails } from "@/lib/contactDetails";
import { RESUME_PATH } from "@/lib/resume";

// Phone and tablet navigation: a bar fixed to the bottom of the screen
// (440px wide at most, centered, on tablet) (same frosted,
// gold-rimmed pill as the old phone header) with Work, About, Resume and
// Contact as icons. No button is highlighted except Contact while its panel
// is open. Contact opens a
// panel of ways to get in touch above the bar, and its icon turns into a
// close cross while the panel is open.

const PILL_CLIP =
  "M 0.901421 0.051007 C 0.929119 0.070647 0.952649 0.159062 0.965553 0.282396 L 1.000000 0.500000 L 0.965553 0.717587 C 0.952649 0.840927 0.929119 0.929333 0.901421 0.948975 V 1.000000 H 0.083448 V 0.930833 C 0.062411 0.894856 0.044920 0.817750 0.034442 0.717587 L 0.000000 0.500000 L 0.034442 0.282396 C 0.044921 0.182236 0.062411 0.105122 0.083448 0.069148 V 0.000000 H 0.901421 V 0.051007 Z";
const GOLD = "#F7C44C";
type Section = "work" | "about";

function scrollTo(id: Section) {
  const target = document.getElementById(id);
  if (!target) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(target, { duration: 1.2, offset: -16 });
  else target.scrollIntoView({ behavior: "smooth" });
}


const icon = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

const ICONS: Record<string, ReactNode> = {
  work: (
    <svg {...icon}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </svg>
  ),
  about: (
    <svg {...icon}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
    </svg>
  ),
  resume: (
    <svg {...icon}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  // a chat bubble (contact = email, WhatsApp or a call, not just mail)
  contact: (
    <svg {...icon}>
      <path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.6A8 8 0 1 1 20.5 11.5z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth={2.6} />
    </svg>
  ),
  close: (
    <svg {...icon}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
};

// icon with a 10px label under it; the active one gets a soft highlight
const BUTTON = "flex h-[46px] w-[52px] flex-col items-center justify-center gap-[2px] rounded-xl transition-colors";
const buttonCls = (active?: boolean) => `${BUTTON} ${active ? "bg-white/20 text-white" : "text-white/80"}`;
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold leading-none tracking-[0.02em]" style={{ fontFamily: "var(--font-manrope)" }}>
      {children}
    </span>
  );
}

function NavButton({ label, active, onClick, href, children }: { label: string; active?: boolean; onClick?: () => void; href?: string; children: ReactNode }) {
  const inner = (
    <>
      {children}
      <Label>{label}</Label>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonCls(active)}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" aria-current={active ? "true" : undefined} onClick={onClick} className={buttonCls(active)}>
      {inner}
    </button>
  );
}

export default function PhoneNav() {
  const [open, setOpen] = useState(false);
  const { email, phone, whatsapp } = useContactDetails();
  const resume = RESUME_PATH;

  // close the contact panel on any scroll or Escape
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const contacts = [
    { label: "Email", detail: email, href: `mailto:${email}`, newTab: false },
    { label: "WhatsApp", detail: phone, href: `https://wa.me/${whatsapp}`, newTab: true },
    { label: "Call", detail: phone, href: `tel:${phone.replace(/\s/g, "")}`, newTab: false },
    { label: "Resume", detail: "View resume", href: resume, newTab: true },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed left-1/2 z-50 w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 desktop:hidden"
      style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}
    >
      {/* registers the pill's clip shape for the frosted backdrop */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="phone-nav-clip" clipPathUnits="objectBoundingBox">
            <path d={PILL_CLIP} />
          </clipPath>
        </defs>
      </svg>

      {/* contact panel, above the bar */}
      <div
        id="phone-contact-panel"
        className={`absolute inset-x-0 bottom-[64px] origin-bottom rounded-2xl border bg-black/55 p-2 backdrop-blur-md backdrop-saturate-150 transition-[opacity,translate,scale] duration-200 ${open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"}`}
        style={{ borderColor: `${GOLD}99` }}
        aria-hidden={!open}
      >
        {contacts.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.newTab ? "_blank" : undefined}
            rel={c.newTab ? "noopener noreferrer" : undefined}
            tabIndex={open ? undefined : -1}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-white active:bg-white/10"
          >
            <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-serif), Merriweather, serif" }}>
              {c.label}
            </span>
            <span className="truncate text-[13px] text-white/70" style={{ fontFamily: "var(--font-manrope)" }}>
              {c.detail}
            </span>
          </a>
        ))}
      </div>

      {/* the bar: same frosted, gold-rimmed pill as the old phone header */}
      <div className="relative h-[52px] w-full">
        <div className="absolute inset-0 bg-black/45 backdrop-blur backdrop-saturate-150" style={{ clipPath: "url(#phone-nav-clip)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
        <img src="/graphics/header-pill-mobile.svg" alt="" width={272.625} height={52} className="pointer-events-none absolute inset-0 h-full w-full select-none" />
        <div className="absolute inset-y-0 left-[9%] right-[9%] flex items-center justify-evenly">
          <NavButton label="Work" onClick={() => scrollTo("work")}>
            {ICONS.work}
          </NavButton>
          <NavButton label="About" onClick={() => scrollTo("about")}>
            {ICONS.about}
          </NavButton>
          <NavButton label="Resume" href={resume}>
            {ICONS.resume}
          </NavButton>
          <button
            type="button"
            aria-label={open ? "Close contact options" : "Contact"}
            aria-expanded={open}
            aria-controls="phone-contact-panel"
            onClick={() => setOpen((v) => !v)}
            className={buttonCls(open)}
          >
            {open ? ICONS.close : ICONS.contact}
            <Label>{open ? "Close" : "Contact"}</Label>
          </button>
        </div>
      </div>
    </nav>
  );
}
