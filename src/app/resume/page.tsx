import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import OrnateFrame from "@/components/resume/OrnateFrame";
import PrintButton from "@/components/resume/PrintButton";
import { boldRuns, parseResume, type ResumeItem } from "@/data/resume";
import { getResumeDoc } from "@/lib/cmsServer";
import { experienceYears, fillYears } from "@/lib/experience";

// The resume page, built from the Figma design "Resume – Ankit Kumar Tiwari
// (site theme)" (709:914): a 900px cream sheet inside the hero's border,
// Arvo section titles, Merriweather sub-headings, Manrope body. On the hero's
// red damask background, with a back link and a "Download PDF" (print)
// button above. Phones get one column (the side column moves below).
// Outside the (site) route group: no loader, header or smooth scroll.

// content comes from the CMS (settings/resume), refreshed at most once a minute
export const revalidate = 60;

const OG_IMAGE = { url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Ankit Kumar Tiwari — Designing & Building Products On Which Startups Bet" };

export function generateMetadata(): Metadata {
  const description = `Ankit Kumar Tiwari, UI/UX Designer with ${experienceYears()} years of experience: work, skills, education and achievements. Download the PDF.`;
  return {
    title: { absolute: "Resume — Ankit Kumar Tiwari" },
    description,
    alternates: { canonical: "/resume" },
    // the site's preview image (src/app/opengraph-image.jpg), set again here
    // because a page's own openGraph replaces the inherited one
    openGraph: { type: "profile", url: "/resume", title: "Resume — Ankit Kumar Tiwari", description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: "Resume — Ankit Kumar Tiwari", description, images: [OG_IMAGE] },
  };
}

const RED = "#960D1A";
const INK = "#2B1B1B";
const BODY = "#4A3A3A";
const MUTED = "#7A6464";

// Figma "Resume / Section Title": gold diamond + Arvo Bold 20, red
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-[10px] font-[family-name:var(--font-arvo)] text-[20px] font-bold leading-normal" style={{ color: RED }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative SVG */}
      <img src="/graphics/resume-diamond.svg" alt="" aria-hidden="true" width={10} height={10} className="block h-[10px] w-[10px] shrink-0" />
      {children}
    </h2>
  );
}

// Figma "Resume / Bullet": red dot + Manrope 13.5 / 1.55
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-[4px]">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative SVG */}
          <img src="/graphics/resume-dot.svg" alt="" aria-hidden="true" width={5} height={13} className="block h-[13px] w-[5px] shrink-0" />
          <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55]" style={{ color: BODY }}>
            {t}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, gap = 10, show = true, children }: { title: string; gap?: number; show?: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <section className="flex flex-col" style={{ gap }}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

const linkCls = "underline underline-offset-2 break-all hover:text-[#960D1A]";

function Item({ item, gap = 2, muted = false }: { item: ResumeItem; gap?: number; muted?: boolean }) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      <h3 className="font-[family-name:var(--font-serif)] text-[14px] font-bold leading-normal" style={{ color: INK }}>
        {item.title}
      </h3>
      {item.text.trim() && (
        <p className="text-[13px] leading-[1.5]" style={{ color: muted ? MUTED : BODY }}>
          {item.text}
        </p>
      )}
      {item.link && (
        <a href={item.link.href} target="_blank" rel="noopener noreferrer" className={`text-[13px] leading-[1.5] ${linkCls}`} style={{ color: BODY }}>
          {item.link.text}
        </a>
      )}
    </div>
  );
}

export default async function ResumePage() {
  const saved = parseResume(await getResumeDoc());
  // {years} -> current years of experience (e.g. "3+", "3.5")
  const r = { ...saved, experience: fillYears(saved.experience), about: fillYears(saved.about) };
  return (
    <main className="resume-page relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_30%,_#960D1A_0%,_#4D050C_100%)] px-4 pb-16 pt-6 tablet:px-8 tablet:pt-8">
      {/* the hero's damask pattern, soft-light over the red */}
      <div aria-hidden="true" className="resume-noprint pointer-events-none absolute inset-0 bg-[url('/images/bg-pattern.webp')] bg-repeat opacity-50 mix-blend-soft-light" />

      <div className="resume-noprint relative mx-auto mb-6 flex max-w-[900px] items-center justify-between gap-4">
        <Link href="/" className="font-[family-name:var(--font-manrope)] text-[14px] font-semibold text-white/90 hover:text-white">
          ← Back to portfolio
        </Link>
        <PrintButton />
      </div>

      <OrnateFrame className="resume-sheet mx-auto max-w-[900px] bg-[#FFF8EE] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <article className="flex flex-col gap-[32px] px-[40px] pb-[96px] pt-[96px] font-[family-name:var(--font-manrope)] tablet:px-[68px] tablet:pb-[72px] tablet:pt-[64px]">
          {/* Header */}
          <header className="flex flex-col gap-4 border-b-2 border-[rgba(226,169,19,0.5)] pb-[24px] tablet:flex-row tablet:items-start tablet:justify-between">
            <div className="flex flex-col gap-[4px]">
              <h1 className="font-[family-name:var(--font-arvo)] text-[30px] font-bold leading-normal tablet:text-[34px]" style={{ color: INK }}>
                {r.name}
              </h1>
              {/* phone: role and experience on two lines, no divider */}
              <p className="flex flex-col gap-1 font-[family-name:var(--font-serif)] text-[16px] font-bold leading-normal tablet:flex-row tablet:items-center tablet:gap-[12px] tablet:text-[18px]" style={{ color: RED }}>
                <span>{r.role}</span>
                {r.experience.trim() && (
                  <>
                    <span aria-hidden="true" className="hidden h-[18px] w-[2px] rounded-[1px] bg-[#E2A913] tablet:block" />
                    <span>{r.experience}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-[6px] pt-[8px] text-[14px] tablet:items-end tablet:text-right" style={{ color: MUTED }}>
              <p>
                Email:{" "}
                <a href={`mailto:${r.email}`} className="underline underline-offset-2 hover:text-[#960D1A]">
                  {r.email}
                </a>
              </p>
              <p>
                Contact:{" "}
                <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="hover:text-[#960D1A]">
                  {r.phone}
                </a>
              </p>
            </div>
          </header>

          {/* Body: main column + 240px side column (stacked on phones) */}
          <div className="flex flex-col gap-[40px] tablet:flex-row tablet:items-start tablet:gap-[52px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[32px]">
              <Section title="About Me" show={!!r.about.trim()}>
                <p className="text-[14px] leading-[1.6]" style={{ color: BODY }}>
                  {boldRuns(r.about).map(([t, bold], i) => (bold ? <strong key={i} className="font-bold">{t}</strong> : <span key={i}>{t}</span>))}
                </p>
              </Section>

              <Section title="Work Experience" gap={16} show={r.jobs.length > 0}>
                <div className="flex flex-col gap-[24px]">
                  {r.jobs.map((job) => (
                    <div key={job.company} className="flex flex-col gap-[8px]">
                      <div className="flex flex-col gap-[2px]">
                        <h3 className="font-[family-name:var(--font-serif)] text-[16px] font-bold leading-normal" style={{ color: INK }}>
                          {job.company}
                        </h3>
                        <p className="text-[13px] font-medium leading-normal" style={{ color: MUTED }}>
                          {job.meta}
                        </p>
                      </div>
                      <Bullets items={job.points} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <aside className="flex flex-col gap-[32px] tablet:w-[240px] tablet:shrink-0">
              <Section title="Links" show={r.links.length > 0}>
                <div className="flex flex-col gap-[12px]">
                  {r.links.map((l) => (
                    <Item key={l.title} item={l} />
                  ))}
                </div>
              </Section>
              <Section title="Education" show={r.education.length > 0}>
                {r.education.map((e) => (
                  <Item key={e.title} item={e} />
                ))}
              </Section>
              <Section title="Certificates" show={r.certificates.length > 0}>
                <Bullets items={r.certificates} />
              </Section>
              <Section title="Achievements" show={r.achievements.length > 0}>
                <div className="flex flex-col gap-[16px]">
                  {r.achievements.map((a) => (
                    <Item key={a.title} item={a} gap={4} muted />
                  ))}
                </div>
              </Section>
              <Section title="Skills" show={r.skills.length > 0}>
                <div className="flex flex-col gap-[16px]">
                  {r.skills.map((s) => (
                    <Item key={s.title} item={s} gap={4} />
                  ))}
                </div>
              </Section>
            </aside>
          </div>
        </article>
      </OrnateFrame>
    </main>
  );
}
