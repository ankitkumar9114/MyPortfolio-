import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import MughalLoader from "@/components/ui/MughalLoader";
import Header from "@/components/layout/Header";
import { getCmsInitial } from "@/lib/cmsServer";
import { CmsInitialProvider } from "@/lib/cmsInitial";

// re-fetch the CMS content at most once a minute (see cmsServer.ts)
export const revalidate = 60;

// The public portfolio's chrome. Split out of the root layout (route group,
// no URL segment) so the /admin CRM renders without the preloader, header and
// smooth scroll (the pixel cursors are CSS, see globals.css). The CMS content is fetched here on the
// server and handed to the page with it.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const cms = await getCmsInitial();
  return (
    <CmsInitialProvider value={cms}>
      <MughalLoader />
      <Header />
      <SmoothScroll>{children}</SmoothScroll>
    </CmsInitialProvider>
  );
}
