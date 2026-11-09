"use client";

import { useEffect, useState, type ReactNode } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CmsItem } from "@/lib/cmsCollection";
import { Button, IconButton, Notice } from "./ui";

// A CMS page for an ordered list stored in one Firestore collection: list
// with preview, shown/hidden toggle, reorder, add / edit / delete in a modal,
// and "start from the built-in items" when empty. Each section supplies its
// own fields (renderFields) and preview (renderPreview).
export type ListPanelProps<T extends CmsItem> = {
  title: string;
  description: string;
  itemName: string; // "channel", "post"
  collectionName: string;
  normalize: (id: string, d: Record<string, unknown>) => T;
  defaults: T[];
  emptyDraft: Omit<T, "id" | "order">;
  renderPreview: (item: Omit<T, "id" | "order">) => ReactNode;
  renderSummary?: (item: T) => ReactNode;
  renderFields: (draft: Omit<T, "id" | "order">, set: (patch: Partial<Omit<T, "id" | "order">>) => void) => ReactNode;
  validate?: (draft: Omit<T, "id" | "order">) => string | null;
};

const strip = <T extends CmsItem>(item: T): Omit<T, "id" | "order"> => {
  const { id: _id, order: _order, ...rest } = item;
  void _id;
  void _order;
  return rest;
};

export default function ListPanel<T extends CmsItem>(p: ListPanelProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; draft: Omit<T, "id" | "order"> } | null>(null);
  const [busy, setBusy] = useState(false);
  const col = () => collection(db()!, p.collectionName);
  const { collectionName, normalize } = p;

  useEffect(
    () =>
      onSnapshot(
        collection(db()!, collectionName),
        (snap) => {
          setItems(snap.docs.map((d) => normalize(d.id, d.data())).sort((a, b) => a.order - b.order));
          setLoadError("");
        },
        (e) => setLoadError(e.message),
      ),
    [collectionName, normalize],
  );

  const move = async (i: number, dir: -1 | 1) => {
    if (!items || !items[i + dir]) return;
    const a = items[i], b = items[i + dir];
    const batch = writeBatch(db()!);
    batch.update(doc(col(), a.id), { order: b.order, updatedAt: serverTimestamp() });
    batch.update(doc(col(), b.id), { order: a.order, updatedAt: serverTimestamp() });
    await batch.commit();
  };

  const importDefaults = async () => {
    setBusy(true);
    try {
      const batch = writeBatch(db()!);
      p.defaults.forEach((item, i) => batch.set(doc(col()), { ...strip(item), order: i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      await batch.commit();
    } finally {
      setBusy(false);
    }
  };

  // edit with every field present (normalize fills defaults for older data)
  const toDraft = (item: Partial<T>) => strip(normalize("draft", { ...p.emptyDraft, ...item } as Record<string, unknown>));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-arvo)] text-3xl font-bold">{p.title}</h1>
          <p className="text-sm text-black/60">{p.description} Changes go live as soon as you save.</p>
        </div>
        <Button onClick={() => setEditing({ id: null, draft: toDraft({}) })}>+ New {p.itemName}</Button>
      </header>

      {loadError && (
        <Notice tone="error">
          Couldn&apos;t load: {loadError}
          {/permission/i.test(loadError) && " — publish the updated firestore.rules in the Firebase console."}
        </Notice>
      )}
      {items === null && !loadError && <p className="text-sm text-black/60">Loading…</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center">
          <p className="mb-1 font-semibold">No {p.itemName}s yet.</p>
          <p className="mb-5 text-sm text-black/60">
            The site is showing its {p.defaults.length} built-in {p.itemName}s until you add one.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setEditing({ id: null, draft: toDraft({}) })}>Add the first one</Button>
            <Button variant="ghost" disabled={busy} onClick={importDefaults}>
              Start from the {p.defaults.length} current {p.itemName}s
            </Button>
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li
              key={it.id}
              className={`flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm sm:flex-row sm:items-center ${it.published ? "" : "opacity-60"}`}
            >
              <div className="shrink-0">{p.renderPreview(it)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  {p.itemName} {i + 1}
                </p>
                {p.renderSummary?.(it)}
                <div className="mt-2">
                  <ShownToggle value={it.published} onChange={(published) => updateDoc(doc(col(), it.id), { published, updatedAt: serverTimestamp() })} />
                </div>
              </div>
              <div className="flex shrink-0 flex-row gap-1">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </IconButton>
                <Button variant="ghost" onClick={() => setEditing({ id: it.id, draft: toDraft(it) })}>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ItemEditor
          {...p}
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
              const order = items && items.length ? Math.max(...items.map((x) => x.order)) + 1 : 0;
              await addDoc(col(), { ...draft, order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export function ShownToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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

function ItemEditor<T extends CmsItem>({
  itemName,
  renderPreview,
  renderFields,
  validate,
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: ListPanelProps<T> & {
  initial: Omit<T, "id" | "order">;
  isNew: boolean;
  onSave: (d: Omit<T, "id" | "order">) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Omit<T, "id" | "order">>) => setD((prev) => ({ ...prev, ...patch }));
  const invalid = validate?.(d) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isNew ? `New ${itemName}` : `Edit ${itemName}`}</h2>
          <button type="button" onClick={onClose} className="text-sm text-black/60 hover:text-black" style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>
        <div className="mb-6 flex justify-center rounded-lg bg-[#E9E5DE] p-4">{renderPreview(d)}</div>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (invalid) return;
            setSaving(true);
            setError("");
            try {
              await onSave(d);
            } catch (err) {
              setError((err as Error).message);
              setSaving(false);
            }
          }}
        >
          {renderFields(d, set)}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.published} onChange={(e) => set({ published: e.target.checked } as Partial<Omit<T, "id" | "order">>)} />
            Show on the website
          </label>
          {(error || invalid) && <Notice tone="error">{error || invalid}</Notice>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {onDelete ? (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!window.confirm(`Delete this ${itemName}? This can't be undone.`)) return;
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
              <Button type="submit" disabled={saving || !!invalid}>
                {saving ? "Saving…" : isNew ? `Add ${itemName}` : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
