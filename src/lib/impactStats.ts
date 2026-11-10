"use client";

import { usePublishedCollection } from "./cmsCollection";

// An "Impact in Numbers" stat card, stored in Firestore (collection
// "impactStats") and edited in the /admin CMS.
export type ImpactStat = {
  id: string;
  heading: string; // e.g. "20% Increase"
  subtitle: string; // e.g. "In the agent enquiry"
  tag: string; // project name, e.g. "ACN"
  order: number; // position in the row, lowest first
  published: boolean; // hidden from the site when false
};

export const IMPACT_STATS_COLLECTION = "impactStats";

// What the site shows until the CMS has published stat cards.
export const DEFAULT_IMPACT_STATS: ImpactStat[] = [
  { heading: "X0% Reduced", subtitle: "Delay of the", tag: "Vault" },
  { heading: "Led Full CRM Design", subtitle: "for Internal Team", tag: "IQOL" },
  { heading: "20% Increase", subtitle: "In the agent enquiry", tag: "ACN" },
  { heading: "40% Increase", subtitle: "In the app usage", tag: "ACN" },
].map((c, i) => ({ ...c, id: `default-${i + 1}`, order: i, published: true }));

export function normalizeImpactStat(id: string, d: Record<string, unknown>): ImpactStat {
  return {
    id,
    heading: typeof d.heading === "string" ? d.heading : "",
    subtitle: typeof d.subtitle === "string" ? d.subtitle : "",
    tag: typeof d.tag === "string" ? d.tag : "",
    order: typeof d.order === "number" ? d.order : 0,
    published: d.published !== false,
  };
}

// Published stat cards, live from Firestore (starting from what the server
// sent with the page); DEFAULT_IMPACT_STATS on error or when none are
// published.
export const useImpactStats = () => usePublishedCollection(IMPACT_STATS_COLLECTION, normalizeImpactStat, DEFAULT_IMPACT_STATS);
