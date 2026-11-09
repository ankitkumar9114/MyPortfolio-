// Server-side read of the CMS content (Firestore REST, no SDK), so the page
// is sent with it already filled in instead of each visitor's browser loading
// Firebase and waiting on it. Cached and refreshed every REVALIDATE_S seconds
// (Incremental Static Regeneration), so CMS edits show up within a minute.
// The browser still subscribes live for most collections (see cmsCollection).

export type RawDoc = { id: string; data: Record<string, unknown> };
export type CmsInitial = {
  collections: Record<string, RawDoc[]>;
  settings: Record<string, Record<string, unknown>>;
};

export const REVALIDATE_S = 60;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Firestore REST values ({ stringValue: "…" }, …) to plain JS values.
type RestValue = Record<string, unknown>;
function fromRest(v: RestValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return ((v.arrayValue as { values?: RestValue[] }).values ?? []).map(fromRest);
  if ("mapValue" in v) return fieldsToObject((v.mapValue as { fields?: Record<string, RestValue> }).fields);
  return undefined;
}
function fieldsToObject(fields: Record<string, RestValue> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromRest(v)]));
}

type RestDoc = { name: string; fields?: Record<string, RestValue>; updateTime?: string };
const docId = (d: RestDoc) => d.name.slice(d.name.lastIndexOf("/") + 1);

// Published documents of a collection; [] if it can't be read.
async function published(collectionId: string): Promise<RawDoc[]> {
  try {
    const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where: { fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } } },
        },
      }),
      next: { revalidate: REVALIDATE_S },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { document?: RestDoc }[];
    return rows.flatMap((r) => (r.document ? [{ id: docId(r.document), data: { ...fieldsToObject(r.document.fields), _updated: r.document.updateTime } }] : []));
  } catch {
    return [];
  }
}

async function settingsDoc(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${BASE}/settings/${id}?key=${API_KEY}`, { next: { revalidate: REVALIDATE_S } });
    if (!res.ok) return null;
    return fieldsToObject(((await res.json()) as RestDoc).fields);
  } catch {
    return null;
  }
}

// A case study's image is stored in its document as a data: URL. Sent to the
// browser as a short, cacheable URL instead (served by
// /api/case-study-image/[id]), versioned by the document's last update so a
// new upload is never stuck behind an old cached copy.
export function caseStudyImageUrl(id: string, updated: unknown) {
  const v = typeof updated === "string" ? Date.parse(updated).toString(36) : "0";
  return `/api/case-study-image/${id}?v=${v}`;
}

export async function getCmsInitial(): Promise<CmsInitial> {
  if (!PROJECT_ID || !API_KEY) return { collections: {}, settings: {} };
  const [caseStudies, impactStats, tvChannels, linkedinPosts, contact] = await Promise.all([
    published("caseStudies"),
    published("impactStats"),
    published("tvChannels"),
    published("linkedinPosts"),
    settingsDoc("contact"),
  ]);
  for (const d of caseStudies) {
    if (typeof d.data.image === "string" && d.data.image.startsWith("data:")) d.data.image = caseStudyImageUrl(d.id, d.data._updated);
  }
  return {
    collections: { caseStudies, impactStats, tvChannels, linkedinPosts },
    settings: contact ? { contact } : {},
  };
}
