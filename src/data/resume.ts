// The resume: its shape, the built-in content (from the Figma design
// "Resume – Ankit Kumar Tiwari (site theme)", node 709:914), and a parser
// that turns a saved document into this shape. Editable in the CMS
// (/admin → Resume, saved as settings/resume); rendered by /resume.

export type ResumeLink = { text: string; href: string };
export type ResumeItem = { title: string; text: string; link?: ResumeLink };
export type ResumeJob = { company: string; meta: string; points: string[] };
export type Resume = {
  name: string;
  role: string;
  experience: string;
  email: string;
  phone: string;
  about: string; // **double asterisks** mark bold phrases; {years} = current years of experience
  jobs: ResumeJob[];
  links: ResumeItem[];
  education: ResumeItem[];
  certificates: string[];
  achievements: ResumeItem[];
  skills: ResumeItem[];
};

export const RESUME_DOC_ID = "resume";

export const DEFAULT_RESUME: Resume = {
  name: "Ankit Kumar Tiwari",
  role: "UI/UX Designer",
  experience: "{years} Years of Experience", // {years}: worked out from the career start (lib/experience.ts)
  email: "ankitiwari3105@gmail.com",
  phone: "+91 7024396102",
  about:
    "**An engineer** by education who found his passion in design, I transitioned into Product Design to combine technology, creativity, and problem-solving. I am a creative and **user-focused** Product Designer with **{years} years** of experience designing digital products for startups and enterprise clients across **B2B and B2C domains**. Currently working as **Head of Design**, independently **building 12+ digital products** from concept to launch using **vibe coding**. Experienced in product building, **UX research**, **user-centred design**, **wireframing**, **prototyping**, **interaction design**, and **design systems**. I work closely with business leaders and managers to define product strategy, make design decisions, and **align user needs with business goals**. My engineering background helps me **collaborate effectively with developers** and turn ideas into practical, scalable, and user-friendly digital products.",
  jobs: [
    {
      company: "alldoors",
      meta: "Product & Design | Full Time | Feb’24 - Present",
      points: [
        "Managed the full design lifecycle for 5 diverse products, successfully adapting UX strategies to suit unique B2B and B2C user bases.",
        "Reduced lead entry time by 65% to speed up the sales process.",
        "Designed seamless SaaS experiences for CRM (MASAL) and real estate platform (TruEstate)",
        "Helped in improving flow of multiple platforms",
        "Owned end-to-end UX workflows: research, wireframes, high-fidelity mockups, and interactive prototypes",
        "Designed a scalable design system, boosting UI consistency and speeding up dev handoffs by 25%",
        "Supported sales and data teams by streamlining property input workflows, improving efficiency by 40%",
      ],
    },
    {
      company: "Sideways Consulting LLP",
      meta: "UI/UX designer | Full Time | Jun’23 - Feb’24",
      points: [
        "Designed app prototypes for Pidilite, blending physical-to-digital interactions",
        "Conducted UX research for Tata Neu and SERB (drone tech) to guide product pitches",
        "Transformed a physical game into an interactive digital version, played in 16+ countries",
        "Explored AR/VR UX for enhanced digital presence and user immersion",
      ],
    },
    {
      company: "Podeum",
      meta: "UI/UX designer | Internship | Feb’22 - Jun’23",
      points: [
        "Created user-centric designs backed by business and user insights",
        "Built reusable design systems and component libraries",
        "Delivered end-to-end wireframes, user flows, mockups, and prototypes",
        "Created 50+ wireframes and mockups aligned to business and user goals",
      ],
    },
    {
      company: "crowdANALYTIX",
      meta: "UI/UX designer | Internship | Aug’22 - Dec’22",
      points: ["Helped architect a unified design system used across multiple products", "Redesigned core user flows to align with new business goals"],
    },
    {
      company: "Thumbstack",
      meta: "Junior UI/UX Designer | Internship | Dec’21 - Feb’22",
      points: [
        "Led the redesign of SBI Realty’s web experience, improving engagement via usability testing",
        "Worked closely with developers to ensure performance-aligned implementations",
      ],
    },
    {
      company: "Blanks Lab",
      meta: "UI/UX Designer | Internship | Aug’21 - Nov’21",
      points: ["Ran market research and competitive analysis for product strategy", "Implemented design thinking for responsive mobile/web UI"],
    },
    {
      company: "Fight Forecaster",
      meta: "UI/UX Designer | Internship | Sep’21 - Oct’21",
      points: ["Ran market research and competitive analysis for product strategy", "Implemented design thinking for responsive mobile/web UI"],
    },
  ],
  links: [
    { title: "Portfolio", text: "", link: { text: "ankitux.co.in", href: "https://www.ankitux.co.in/" } },
    { title: "LinkedIn", text: "", link: { text: "linkedin.com/in/ankit-tiwari-50ab53193/", href: "https://www.linkedin.com/in/ankit-tiwari-50ab53193/" } },
  ],
  education: [{ title: "Army Institute of Technology", text: "B.E. in Entc / Jul’19 - Jun’23" }],
  certificates: [
    "Design for the 21st Century with Don Norman",
    "Visual Design: The Ultimate Guide",
    "Become a UX Designer from Scratch",
    "Human-Computer Interaction: The Foundations of UX Design",
  ],
  achievements: [
    { title: "Level 2 seller on Fiverr", text: "I have completed 100+ orders on Fiverr with 100% satisfied buyers." },
    {
      title: "SBI realty website",
      text: "I conducted research, UX testing, and implemented improvements to revamp SBI Realty’s web design, resulting in an intuitive and engaging user experience.",
      link: { text: "www.sbirealty.in/property/home", href: "https://www.sbirealty.in/property/home" },
    },
    { title: "Logo Design for @orbitgeo", text: "I have made a logo for a famous Instagram page Orbit Geo, which has +110k followers." },
  ],
  skills: [
    { title: "Product & UX Design:", text: "UX Research · Interaction Design · UI Design · Wireframing · Prototyping · Usability Testing · Design Systems" },
    { title: "Product Building:", text: "Vibe Coding · Building products end to end, from concept to launch · Claude Code" },
    { title: "Tools", text: "Figma · Photoshop · Illustrator · After Effects · Blender 3D · Amplitude · Premiere Pro" },
    { title: "Soft Skills", text: "Collaboration · Communication · Problem-solving · Critical Thinking · Detail-Oriented" },
  ],
};

// --- parsing a saved document (anything malformed falls back to the default)
const s = (v: unknown) => (typeof v === "string" ? v : "");
const rec = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const link = (v: unknown): ResumeLink | undefined => {
  const r = rec(v);
  return s(r.href).trim() ? { text: s(r.text) || s(r.href), href: s(r.href).trim() } : undefined;
};
const item = (v: unknown): ResumeItem => {
  const r = rec(v);
  return { title: s(r.title), text: s(r.text), link: link(r.link) };
};
const items = (v: unknown, fb: ResumeItem[]) => (Array.isArray(v) ? arr(v).map(item).filter((i) => i.title || i.text) : fb);

export function parseResume(data: unknown): Resume {
  const d = rec(data);
  if (!Object.keys(d).length) return DEFAULT_RESUME;
  const D = DEFAULT_RESUME;
  return {
    name: s(d.name) || D.name,
    role: s(d.role) || D.role,
    experience: typeof d.experience === "string" ? d.experience : D.experience,
    email: s(d.email) || D.email,
    phone: s(d.phone) || D.phone,
    about: typeof d.about === "string" ? d.about : D.about,
    jobs: Array.isArray(d.jobs)
      ? arr(d.jobs)
          .map((j) => {
            const r = rec(j);
            return { company: s(r.company), meta: s(r.meta), points: arr(r.points).map(s).filter(Boolean) };
          })
          .filter((j) => j.company)
      : D.jobs,
    links: items(d.links, D.links),
    education: items(d.education, D.education),
    certificates: Array.isArray(d.certificates) ? arr(d.certificates).map(s).filter(Boolean) : D.certificates,
    achievements: items(d.achievements, D.achievements),
    skills: items(d.skills, D.skills),
  };
}

// "**bold** text" -> [text, bold] runs for rendering
export function boldRuns(text: string): [string, boolean][] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith("**") && part.endsWith("**") ? [part.slice(2, -2), true] : [part, false]));
}
