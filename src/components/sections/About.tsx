import Reveal from "@/components/ui/Reveal";

const STATS = [
  { value: "5+", label: "Years experience" },
  { value: "40+", label: "Projects shipped" },
  { value: "12", label: "Awards & mentions" },
];

export default function About() {
  return (
    <section id="about" className="border-t border-[var(--border)] px-6 py-28 sm:px-10">
      <div className="grid gap-16 sm:grid-cols-2">
        <Reveal>
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
            About
          </span>
          <p className="mt-6 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
            I&apos;m a designer &amp; developer who builds interfaces that
            feel as good as they look — blending clean engineering with the
            kind of detail that gets noticed.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-col gap-8 sm:mt-16">
            <p className="max-w-md text-[var(--muted)]">
              Placeholder bio — swap this with your own story: background,
              focus areas, tools you love, and what kind of work you&apos;re
              looking for next.
            </p>
            <div className="grid grid-cols-3 gap-6 border-t border-[var(--border)] pt-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="font-[family-name:var(--font-display)] text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
