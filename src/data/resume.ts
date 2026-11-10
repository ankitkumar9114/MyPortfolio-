// Resume content, from the Figma design "Resume – Ankit Kumar Tiwari (site
// theme)" (node 709:914). Rendered by src/app/resume/page.tsx.

export type ResumeJob = { company: string; meta: string; points: string[] };
export type ResumeItem = { title: string; text?: string; link?: { text: string; href: string } };

// About Me: [text, bold?] runs, as in the design
export const ABOUT: [string, boolean?][] = [
  ["An engineer", true],
  [" by education who found his passion in design, I transitioned into Product Design to combine technology, creativity, and problem-solving. I am a creative and "],
  ["user-focused", true],
  [" Product Designer with "],
  ["3+ years", true],
  [" of experience designing digital products for startups and enterprise clients across "],
  ["B2B and B2C domains", true],
  [". Currently working as "],
  ["Head of Design", true],
  [", independently "],
  ["building 12+ digital products", true],
  [" from concept to launch using "],
  ["vibe coding", true],
  [". Experienced in product building, "],
  ["UX research", true],
  [", "],
  ["user-centred design", true],
  [", "],
  ["wireframing", true],
  [", "],
  ["prototyping", true],
  [", "],
  ["interaction design", true],
  [", and "],
  ["design systems", true],
  [". I work closely with business leaders and managers to define product strategy, make design decisions, and "],
  ["align user needs with business goals", true],
  [". My engineering background helps me "],
  ["collaborate effectively with developers", true],
  [" and turn ideas into practical, scalable, and user-friendly digital products."],
];

export const RESUME = {
  name: "Ankit Kumar Tiwari",
  role: "UI/UX Designer",
  experience: "3+ Years of Experience",
  email: "ankitiwari3105@gmail.com",
  phone: "+91 7024396102",
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
  ] satisfies ResumeJob[],
  links: [
    { title: "Portfolio", link: { text: "ankitux.co.in", href: "https://www.ankitux.co.in/" } },
    { title: "LinkedIn", link: { text: "linkedin.com/in/ankit-tiwari-50ab53193/", href: "https://www.linkedin.com/in/ankit-tiwari-50ab53193/" } },
  ] satisfies ResumeItem[],
  education: [{ title: "Army Institute of Technology", text: "B.E. in Entc / Jul’19 - Jun’23" }] satisfies ResumeItem[],
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
  ] satisfies ResumeItem[],
  skills: [
    { title: "Product & UX Design:", text: "UX Research · Interaction Design · UI Design · Wireframing · Prototyping · Usability Testing · Design Systems" },
    { title: "Tools", text: "Figma · Photoshop · Illustrator · After Effects · Blender 3D · Amplitude · Premiere Pro" },
    { title: "Soft Skills", text: "Collaboration · Communication · Problem-solving · Critical Thinking · Detail-Oriented" },
  ] satisfies ResumeItem[],
};
