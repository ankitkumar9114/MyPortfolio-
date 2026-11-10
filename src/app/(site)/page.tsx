import GradientHero from "@/components/sections/GradientHero";
import ProblemsSolved from "@/components/sections/ProblemsSolved";
import ImpactInNumbers from "@/components/sections/ImpactInNumbers";
import ProductIBuild from "@/components/sections/ProductIBuild";
import AfterChatai from "@/components/sections/AfterChatai";
import Footer from "@/components/sections/Footer";
import PauseOffscreenAnimations from "@/components/providers/PauseOffscreenAnimations";

export default function Home() {
  return (
    <main>
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
