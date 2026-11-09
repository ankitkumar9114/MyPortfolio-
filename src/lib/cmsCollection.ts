"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useCmsInitial } from "./cmsInitial";

// Shared Firestore hooks for the site's CMS-driven sections. Every list item
// has an `order` and a `published` flag; the site only reads published ones.
export type CmsItem = { id: string; order: number; published: boolean };

// Published items of `name`, sorted. Starts from the content the server sent
// with the page (cmsInitial), then stays live unless `live` is false. Falls
// back to `defaults` if there's nothing (Firebase not configured or not
// readable, or nothing published yet), so the site always has something to
// show.
export function usePublishedCollection<T extends CmsItem>(
  name: string,
  normalize: (id: string, d: Record<string, unknown>) => T,
  defaults: T[],
  { live = true }: { live?: boolean } = {},
): T[] {
  const initial = useCmsInitial().collections[name];
  const [items, setItems] = useState<T[] | null>(() =>
    initial?.length ? initial.map((d) => normalize(d.id, d.data)).sort((a, b) => a.order - b.order) : null,
  );
  const hasInitial = !!initial?.length;
  useEffect(() => {
    if (!live && hasInitial) return;
    const firestore = db();
    if (!firestore) return;
    return onSnapshot(
      query(collection(firestore, name), where("published", "==", true)),
      (snap) => setItems(snap.docs.map((d) => normalize(d.id, d.data())).sort((a, b) => a.order - b.order)),
      (err) => {
        console.warn(`${name}: using built-in content,`, err.message);
        setItems(null);
      },
    );
    // normalize is a module-level function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, live, hasInitial]);
  return items && items.length ? items : defaults;
}

// A single settings document (collection "settings"), live, merged over
// `defaults` field by field.
export function useSettingsDoc<T extends Record<string, unknown>>(id: string, defaults: T): T {
  const initial = useCmsInitial().settings[id] as Partial<T> | undefined;
  const [data, setData] = useState<Partial<T> | null>(initial ?? null);
  useEffect(() => {
    const firestore = db();
    if (!firestore) return;
    return onSnapshot(
      doc(firestore, "settings", id),
      (snap) => setData((snap.data() as Partial<T> | undefined) ?? null),
      (err) => console.warn(`settings/${id}: using built-in values,`, err.message),
    );
  }, [id]);
  const merged = { ...defaults };
  if (data) for (const k of Object.keys(defaults) as (keyof T)[]) if (typeof data[k] === typeof defaults[k] && data[k] !== "") merged[k] = data[k] as T[keyof T];
  return merged;
}

export const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
export const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
