// Streams a Google Drive video for the TV. Chrome blocks Drive's download
// URL inside <video> (ERR_BLOCKED_BY_ORB), so the TV plays
// /api/drive-video?id=<file id> instead and this handler fetches the file
// from Drive server-side, passing the browser's Range header through so
// seeking and looping work. Only Drive files used by a published TV channel
// are served, so the route can't be used to proxy any other file.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ALLOWED_TTL_MS = 60_000;

let allowed: { ids: Set<string>; at: number } | null = null;

// Drive file ids in the published tvChannels docs (public read per
// firestore.rules), cached for a minute.
async function allowedIds(): Promise<Set<string>> {
  if (allowed && Date.now() - allowed.at < ALLOWED_TTL_MS) return allowed.ids;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "tvChannels" }],
          where: { fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } } },
        },
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) return allowed?.ids ?? new Set();
  const rows = (await res.json()) as { document?: { fields?: { video?: { stringValue?: string } } } }[];
  const ids = new Set<string>();
  for (const row of rows) {
    const id = driveFileId(row.document?.fields?.video?.stringValue ?? "");
    if (id) ids.add(id);
  }
  allowed = { ids, at: Date.now() };
  return ids;
}

function driveFileId(url: string) {
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(url)) return null;
  return url.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.match(/[?&]id=([\w-]+)/)?.[1] ?? null;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{10,100}$/.test(id) || !(await allowedIds()).has(id)) {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download`, {
    headers: range ? { Range: range } : {},
    cache: "no-store",
  });
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("video/")) {
    // Drive answers with an HTML page when the file isn't shared publicly.
    return new Response("Video unavailable", { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
