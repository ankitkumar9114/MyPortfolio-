"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

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
  { heading: "Lead Full CRM Design", subtitle: "for internal Team", tag: "IQOL" },
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

// Published stat cards, live from Firestore; DEFAULT_IMPACT_STATS while
// loading, on error, or when none are published.
export function useImpactStats(): ImpactStat[] {
  const [stats, setStats] = useState<ImpactStat[] | null>(null);
  useEffect(() => {
    const firestore = db();
    if (!firestore) return;
    const q = query(collection(firestore, IMPACT_STATS_COLLECTION), where("published", "==", true));
    return onSnapshot(
      q,
      (snap) => setStats(snap.docs.map((d) => normalizeImpactStat(d.id, d.data())).sort((a, b) => a.order - b.order)),
      (err) => {
        console.warn("Impact stats: using built-in cards,", err.message);
        setStats(null);
      },
    );
  }, []);
  return stats && stats.length ? stats : DEFAULT_IMPACT_STATS;
}
