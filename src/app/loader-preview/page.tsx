import { notFound } from "next/navigation";
import MughalFrame from "@/components/ui/MughalFrame";

// Development-only preview of the new loader's frame (border + background).
// Not part of the live site: 404 in production builds.
export const metadata = { title: "Loader preview", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MughalFrame />;
}
