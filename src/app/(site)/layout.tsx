import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import Preloader from "@/components/ui/Preloader";
import Header from "@/components/layout/Header";

// The public portfolio's chrome. Split out of the root layout (route group,
// no URL segment) so the /admin CRM renders without the preloader, custom
// cursor, header and smooth scroll.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Preloader />
      <CustomCursor />
      <Header />
      <SmoothScroll>{children}</SmoothScroll>
    </>
  );
}
