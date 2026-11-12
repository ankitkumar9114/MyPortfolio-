import { notFound } from "next/navigation";
import MughalFrame from "@/components/ui/MughalFrame";

// Development-only preview of the new loader's frame (border + background).
// Not part of the live site: 404 in production builds.
// ?p=0..100 freezes the loader at that percentage (100 plays the reveal
// once); without it, it counts up, reveals the site, and starts again.
export const metadata = { title: "Loader preview", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const p = Number((await searchParams).p);
  const progress = Number.isFinite(p) && (await searchParams).p !== undefined ? Math.min(100, Math.max(0, p)) : undefined;
  return (
    <>
      {/* the site itself behind the loader, so the reveal shows it (?noloader:
          the site's current loader doesn't play inside this frame) */}
      <iframe src="/?noloader" title="Site" className="fixed inset-0 h-full w-full border-0" />
      <MughalFrame progress={progress} />
    </>
  );
}
