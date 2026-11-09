"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_IMPACT_STATS, IMPACT_STATS_COLLECTION, normalizeImpactStat, type ImpactStat } from "@/lib/impactStats";
import ImpactStatCard from "@/components/sections/ImpactStatCard";
import { Button, Field, INPUT, IconButton, Notice } from "./ui";

type Draft = Omit<ImpactStat, "id" | "order">;
const EMPTY: Draft = { heading: "", subtitle: "", tag: "", published: true };

// The "Impact in Numbers" section of the CMS: the stat cards in the
// scrolling row on the site.
export default function ImpactStatsPanel() {
  const [stats, setStats] = useState<ImpactStat[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const col = () => collection(db()!, IMPACT_STATS_COLLECTION);

  useEffect(
    () =>
      onSnapshot(
        collection(db()!, IMPACT_STATS_COLLECTION),
        (snap) => {
          setStats(snap.docs.map((d) => normalizeImpactStat(d.id, d.data())).sort((a, b) => a.order - b.order));
          setLoadError("");
        },
        (e) => setLoadError(e.message),
      ),
    [],
  );

  const move = async (i: number, dir: -1 | 1) => {
    if (!stats || !stats[i + dir]) return;
    const a = stats[i], b = stats[i + dir];
    const batch = writeBatch(db()!);
    batch.update(doc(col(), a.id), { order: b.order, updatedAt: serverTimestamp() });
    batch.update(doc(col(), b.id), { order: a.order, updatedAt: serverTimestamp() });
    await batch.commit();
  };

  const importDefaults = async () => {
    setBusy(true);
    try {
      const batch = writeBatch(db()!);
      DEFAULT_IMPACT_STATS.forEach(({ heading, subtitle, tag, published }, i) =>
        batch.set(doc(col()), { heading, subtitle, tag, published, order: i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
      );
      await batch.commit();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-arvo)] text-3xl font-bold">Impact in Numbers</h1>
          <p className="text-sm text-black/60">The stat cards scrolling in the “Impact in Numbers” row. Changes go live as soon as you save.</p>
        </div>
        <Button onClick={() => setEditing({ id: null, draft: EMPTY })}>+ New stat card</Button>
      </header>

      {loadError && (
        <Notice tone="error">
          Couldn&apos;t load stat cards: {loadError}
          {/permission/i.test(loadError) && " — publish the updated firestore.rules in the Firebase console."}
        </Notice>
      )}
      {stats === null && !loadError && <p className="text-sm text-black/60">Loading…</p>}

      {stats && stats.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center">
          <p className="mb-1 font-semibold">No stat cards yet.</p>
          <p className="mb-5 text-sm text-black/60">The site is showing its 4 built-in cards until you add one.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setEditing({ id: null, draft: EMPTY })}>Add the first one</Button>
            <Button variant="ghost" disabled={busy} onClick={importDefaults}>
              Start from the 4 current cards
            </Button>
          </div>
        </div>
      )}

      {stats && stats.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {stats.map((s, i) => (
            <li key={s.id} className={`flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ${s.published ? "" : "opacity-60"}`}>
              <div className="flex justify-center rounded-lg bg-[#E9E5DE] py-4">
                <StatPreview stat={s} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <VisibilityToggle
                  value={s.published}
                  onChange={(published) => updateDoc(doc(col(), s.id), { published, updatedAt: serverTimestamp() })}
                />
                <div className="flex gap-1">
                  <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                    ←
                  </IconButton>
                  <IconButton label="Move later" disabled={i === stats.length - 1} onClick={() => move(i, 1)}>
                    →
                  </IconButton>
                  <Button
                    variant="ghost"
                    onClick={() => setEditing({ id: s.id, draft: { heading: s.heading, subtitle: s.subtitle, tag: s.tag, published: s.published } })}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <StatEditor
          initial={editing.draft}
          isNew={editing.id === null}
          onClose={() => setEditing(null)}
          onDelete={
            editing.id
              ? async () => {
                  await deleteDoc(doc(col(), editing.id!));
                  setEditing(null);
                }
              : undefined
          }
          onSave={async (draft) => {
            if (editing.id) {
              await updateDoc(doc(col(), editing.id), { ...draft, updatedAt: serverTimestamp() });
            } else {
              const order = stats && stats.length ? Math.max(...stats.map((s) => s.order)) + 1 : 0;
              await addDoc(col(), { ...draft, order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// The real site card at its phone size (260px wide).
function StatPreview({ stat }: { stat: Pick<ImpactStat, "heading" | "subtitle" | "tag"> }) {
  return (
    <div className="pointer-events-none">
      <ImpactStatCard heading={stat.heading || "Heading"} subtitle={stat.subtitle || "Subtitle"} tag={stat.tag || "Tag"} />
    </div>
  );
}

function VisibilityToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="radiogroup" aria-label="Visibility" className="inline-flex rounded-lg bg-black/5 p-0.5">
      {(
        [
          [true, "Shown"],
          [false, "Hidden"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => value !== v && onChange(v)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            value === v ? (v ? "bg-green-600 text-white shadow-sm" : "bg-neutral-500 text-white shadow-sm") : "text-black/60 hover:text-black"
          }`}
          style={{ cursor: "pointer" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StatEditor({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Draft;
  isNew: boolean;
  onSave: (d: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isNew ? "New stat card" : "Edit stat card"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-black/60 hover:text-black" style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div className="mb-6 flex justify-center rounded-lg bg-[#E9E5DE] py-6">
          <StatPreview stat={d} />
        </div>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError("");
            try {
              await onSave({ ...d, heading: d.heading.trim(), subtitle: d.subtitle.trim(), tag: d.tag.trim() });
            } catch (err) {
              setError((err as Error).message);
              setSaving(false);
            }
          }}
        >
          <Field label="Heading" hint="The big number line, e.g. “20% Increase”. Keep it short; it stays on one line.">
            <input required maxLength={28} value={d.heading} onChange={(e) => set("heading", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Subtitle" hint="e.g. “In the agent enquiry”.">
            <input maxLength={40} value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Project tag" hint="Shown in red at the bottom, e.g. “ACN”.">
            <input required maxLength={18} value={d.tag} onChange={(e) => set("tag", e.target.value)} className={INPUT} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.published} onChange={(e) => set("published", e.target.checked)} />
            Show on the website
          </label>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {onDelete ? (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!window.confirm("Delete this stat card? This can't be undone.")) return;
                  setSaving(true);
                  try {
                    await onDelete();
                  } catch (err) {
                    setError((err as Error).message);
                    setSaving(false);
                  }
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : isNew ? "Add stat card" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
