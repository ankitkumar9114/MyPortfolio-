"use client";

import type { MouseEvent } from "react";
import { getLenis } from "@/lib/lenisInstance";
import { useContactDetails } from "@/lib/contactDetails";

// Section links sit two either side of the logo, all five equally spaced.
// Section links glide there through Lenis (a plain hash jump would fight
// the smooth scroll); the resume opens in a new tab.
const LEFT = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
];
// Resume's link comes from the CMS (/admin → Contact details).
const RIGHT = (resume: string) => [
  { label: "Contact", href: "#contact" },
  { label: "Resume", href: resume, external: true },
];

type NavItem = { label: string; href: string; external?: boolean };

function scrollToSection(e: MouseEvent<HTMLAnchorElement>, href: string) {
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return;
  e.preventDefault();
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else target.scrollIntoView({ behavior: "smooth" });
  history.replaceState(null, "", href);
}

function NavLink({ item }: { item: NavItem }) {
  return (
    <a
      href={item.href}
      {...(item.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : { onClick: (e: MouseEvent<HTMLAnchorElement>) => scrollToSection(e, item.href) })}
      data-cursor="hover"
      className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-wide text-white transition-colors hover:text-white/75"
    >
      {item.label}
    </a>
  );
}

export default function HeaderNav() {
  const { resume } = useContactDetails();
  return (
    <nav aria-label="Main" className="absolute inset-y-0 left-[72px] right-[72px] flex items-center justify-between">
      {LEFT.map((item) => (
        <NavLink key={item.label} item={item} />
      ))}
      <a
        href="#top"
        aria-label="Ankit, back to top"
        onClick={(e) => {
          e.preventDefault();
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(0, { duration: 1.4 });
          else window.scrollTo({ top: 0, behavior: "smooth" });
          history.replaceState(null, "", location.pathname);
        }}
        data-cursor="hover"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local decorative SVG, no raster optimization to gain */}
        <img src="/graphics/ankit-logo.svg" alt="" width={35} height={37} className="h-[41.625px] w-[39.375px] select-none" />
      </a>
      {RIGHT(resume).map((item) => (
        <NavLink key={item.label} item={item} />
      ))}
    </nav>
  );
}
