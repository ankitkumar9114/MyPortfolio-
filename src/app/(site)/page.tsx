import GradientHero from "@/components/sections/GradientHero";
import ProblemsSolved from "@/components/sections/ProblemsSolved";
import ImpactInNumbers from "@/components/sections/ImpactInNumbers";
import ProductIBuild from "@/components/sections/ProductIBuild";
import AfterChatai from "@/components/sections/AfterChatai";
import Footer from "@/components/sections/Footer";
import PauseOffscreenAnimations from "@/components/providers/PauseOffscreenAnimations";

// Structured data (schema.org Person) so search engines know whose site this is.
const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Ankit Kumar Tiwari",
  jobTitle: "UI/UX & Product Designer",
  url: "https://www.ankitux.co.in",
  image: "https://www.ankitux.co.in/opengraph-image.jpg",
  email: "mailto:ankitiwari3105@gmail.com",
  sameAs: ["https://www.linkedin.com/in/ankit-tiwari-50ab53193/"],
  knowsAbout: ["UI/UX design", "Product design", "UX research", "Design systems", "Prototyping", "Vibe coding"],
  alumniOf: { "@type": "CollegeOrUniversity", name: "Army Institute of Technology" },
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD).replace(/</g, "\\u003c") }} />
      <GradientHero />
      <ProblemsSolved />
      <ImpactInNumbers />
      <ProductIBuild />
      <AfterChatai />
      <Footer />
      <PauseOffscreenAnimations />
    </main>
  );
}
