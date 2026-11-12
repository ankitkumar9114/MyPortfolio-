import { notFound } from "next/navigation";
import LoaderPreview from "./LoaderPreview";

// Development-only: plays the loader over the site, with buttons to switch
// between its endings and replay it. 404 in production builds.
export const metadata = { title: "Loader preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LoaderPreview />;
}
