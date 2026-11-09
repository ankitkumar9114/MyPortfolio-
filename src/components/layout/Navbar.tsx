"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";

const LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 sm:px-10">
      <Magnetic>
        <a
          href="#top"
          data-cursor="hover"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight"
        >
          Your Name
        </a>
      </Magnetic>

      {/* Desktop links */}
      <nav className="hidden items-center gap-10 sm:flex">
        {LINKS.map((link) => (
          <Magnetic key={link.href}>
            <a
              href={link.href}
              data-cursor="hover"
              className="text-sm uppercase tracking-[0.15em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {link.label}
            </a>
          </Magnetic>
        ))}
      </nav>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-cursor="hover"
        className="relative z-50 flex h-8 w-8 flex-col items-center justify-center gap-1.5 sm:hidden"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
          className="h-px w-6 bg-[var(--foreground)]"
        />
        <motion.span
          animate={{ opacity: open ? 0 : 1 }}
          className="h-px w-6 bg-[var(--foreground)]"
        />
        <motion.span
          animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
          className="h-px w-6 bg-[var(--foreground)]"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[var(--background)] sm:hidden"
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-[family-name:var(--font-display)] text-4xl"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
