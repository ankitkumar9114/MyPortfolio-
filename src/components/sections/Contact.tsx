import Magnetic from "@/components/ui/Magnetic";
import Reveal from "@/components/ui/Reveal";

const SOCIALS = [
  { label: "Email", href: "mailto:hello@example.com" },
  { label: "LinkedIn", href: "#" },
  { label: "Twitter / X", href: "#" },
  { label: "GitHub", href: "#" },
];

export default function Contact() {
  return (
    <section
      id="contact"
      className="border-t border-[var(--border)] px-6 py-28 sm:px-10"
    >
      <Reveal>
        <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Contact
        </span>
      </Reveal>

      <Reveal delay={0.1}>
        <Magnetic strength={0.25} className="mt-8 block w-fit">
          <a
            href="mailto:hello@example.com"
            data-cursor="hover"
            className="font-[family-name:var(--font-display)] text-[10vw] leading-none tracking-tight transition-opacity hover:opacity-70 sm:text-[6vw]"
          >
            Let&apos;s talk ↗
          </a>
        </Magnetic>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-20 flex flex-col gap-8 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                data-cursor="hover"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                {social.label}
              </a>
            ))}
          </div>
          <span className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} Your Name. All rights reserved.
          </span>
        </div>
      </Reveal>
    </section>
  );
}
