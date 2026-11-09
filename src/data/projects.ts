export type Project = {
  title: string;
  category: string;
  year: string;
  color: string; // CSS gradient used as a placeholder preview until real imagery is added
  href: string;
};

// Placeholder work — swap these out for your real projects.
// `color` drives the floating preview card until you add real thumbnails.
export const projects: Project[] = [
  {
    title: "Nova Studio",
    category: "Brand & Web Design",
    year: "2026",
    color: "linear-gradient(135deg, #ff6b6b, #f8b400)",
    href: "#",
  },
  {
    title: "Aether",
    category: "Product Design",
    year: "2025",
    color: "linear-gradient(135deg, #6a5cff, #22d3ee)",
    href: "#",
  },
  {
    title: "Formless",
    category: "Interactive Experience",
    year: "2025",
    color: "linear-gradient(135deg, #22c55e, #0ea5e9)",
    href: "#",
  },
  {
    title: "Halcyon",
    category: "E-Commerce",
    year: "2024",
    color: "linear-gradient(135deg, #f472b6, #a855f7)",
    href: "#",
  },
];
