// A case study's card image as a real, cacheable image file. Images are stored
// in the Firestore document as data: URLs (no Cloud Storage on the free plan);
// serving them from here lets the page reference a short URL, lets the
// browser load them in parallel, and lets Vercel's CDN and the browser cache
// them. The URL carries ?v=<last update>, so caching it for a year is safe.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,100}$/.test(id)) return new Response("Not found", { status: 404 });
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/caseStudies/${id}?key=${API_KEY}&mask.fieldPaths=image&mask.fieldPaths=published`,
    { cache: "no-store" },
  );
  if (!res.ok) return new Response("Not found", { status: 404 });
  const fields = ((await res.json()) as { fields?: { image?: { stringValue?: string }; published?: { booleanValue?: boolean } } }).fields;
  const image = fields?.image?.stringValue ?? "";
  const match = image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  // only published case studies (same rule as the public Firestore read)
  if (!match || fields?.published?.booleanValue !== true) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
