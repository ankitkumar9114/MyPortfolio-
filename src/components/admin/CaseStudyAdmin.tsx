"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button, Field, INPUT, IconButton, Notice } from "./ui";
import {
  CASE_STUDIES_COLLECTION,
  DEFAULT_CASE_STUDIES,
  compressImage,
  normalizeCaseStudy,
  DEFAULT_IMAGE_SETTINGS,
  STATUS_LABELS,
  statusFields,
  type CaseStudy,
  type CaseStudyStatus,
} from "@/lib/caseStudies";
import CaseStudyCard, { CARD_HEIGHT, CARD_WIDTH } from "@/components/sections/CaseStudyCard";
import CaseStudyImage from "@/components/sections/CaseStudyImage";

type Draft = Omit<CaseStudy, "id" | "order">;
const EMPTY: Draft = { tags: [], title: "", body: "", image: "", ...DEFAULT_IMAGE_SETTINGS, background: "#7A124F", link: "", ...statusFields("live") };
// A complete, valid draft from any case study data: runs it through the same
// normalizer as the site, so fields added later (image settings, status, tags)
// always get their defaults instead of being undefined.
function toDraft(data: Partial<Draft>): Draft {
  const { id: _id, order: _order, ...rest } = normalizeCaseStudy("draft", { ...EMPTY, ...data } as Record<string, unknown>);
  void _id;
  void _order;
  return rest;
}

const SWATCHES = ["#3B1F87", "#7A124F", "#0F6B5C", "#C97B2E", "#2B4C7E", "#1E1B18"];

// The Case studies section of the CMS (inside AdminShell, which handles sign-in).
export default function CaseStudiesPanel() {
  const [studies, setStudies] = useState<CaseStudy[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const firestore = db()!;
    return onSnapshot(
      collection(firestore, CASE_STUDIES_COLLECTION),
      (snap) => {
        setStudies(snap.docs.map((d) => normalizeCaseStudy(d.id, d.data())).sort((a, b) => a.order - b.order));
        setLoadError("");
      },
      (e) => setLoadError(e.message),
    );
  }, []);

  const col = () => collection(db()!, CASE_STUDIES_COLLECTION);

  const move = async (index: number, dir: -1 | 1) => {
    if (!studies) return;
    const other = studies[index + dir];
    if (!other) return;
    const batch = writeBatch(db()!);
    batch.update(doc(col(), studies[index].id), { order: other.order, updatedAt: serverTimestamp() });
    batch.update(doc(col(), other.id), { order: studies[index].order, updatedAt: serverTimestamp() });
    await batch.commit();
  };

  const importDefaults = async () => {
    setBusy(true);
    try {
      const batch = writeBatch(db()!);
      DEFAULT_CASE_STUDIES.forEach((s, i) => {
        const { id: _id, ...rest } = s;
        void _id;
        batch.set(doc(col()), { ...rest, order: i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-arvo)] text-3xl font-bold">Case studies</h1>
          <p className="text-sm text-black/60">Changes go live on the site as soon as you save.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditing({ id: null, draft: EMPTY })}>+ New case study</Button>
        </div>
      </header>

      {loadError && <Notice tone="error">Couldn&apos;t load case studies: {loadError}</Notice>}
      {studies === null && !loadError && <p className="text-sm text-black/60">Loading…</p>}

      {studies && studies.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-8 text-center">
          <p className="mb-1 font-semibold">No case studies yet.</p>
          <p className="mb-5 text-sm text-black/60">The site is showing its 5 built-in placeholder cards until you add one.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setEditing({ id: null, draft: EMPTY })}>Add the first one</Button>
            <Button variant="ghost" disabled={busy} onClick={importDefaults}>
              Start from the 5 placeholder cards
            </Button>
          </div>
        </div>
      )}

      {studies && studies.length > 0 && (
        <ul className="space-y-3">
          {studies.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm sm:flex-row sm:items-center">
              <CardThumb study={s} width={200} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{s.title || "Untitled"}</span>
                </div>
                {s.tags.length > 0 && <p className="text-xs text-black/50">{s.tags.join(" • ")}</p>}
                <p className="line-clamp-2 text-sm text-black/60">{s.body}</p>
                <div className="mt-2">
                  <StatusPicker
                    small
                    value={s.status}
                    onChange={(st) => updateDoc(doc(col(), s.id), { ...statusFields(st), updatedAt: serverTimestamp() })}
                  />
                </div>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-blue-700 underline">
                    {s.link}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-row gap-1">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label="Move down" disabled={i === studies.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </IconButton>
                <Button variant="ghost" onClick={() => setEditing({ id: s.id, draft: toDraft(s) })}>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor
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
              const order = studies && studies.length ? Math.max(...studies.map((s) => s.order)) + 1 : 0;
              await addDoc(col(), { ...draft, order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Editor({
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
  const [d, setD] = useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [tagInputs, setTagInputs] = useState<string[]>([0, 1, 2].map((i) => initial.tags[i] ?? ""));
  const cleanTags = (list: string[]) => list.map((x) => x.trim()).filter(Boolean);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const linkOk = !d.link || /^https?:\/\/\S+$/i.test(d.link);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isNew ? "New case study" : "Edit case study"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-black/60 hover:text-black" style={{ cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div className="mb-6 overflow-hidden rounded-lg bg-[#2a1a12] p-4">
          <p className="mb-2 text-xs text-white/60">Preview</p>
          <CardThumb study={{ ...d, id: "preview", order: 0 }} width={680} interactive />
        </div>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!linkOk) return;
            setSaving(true);
            setError("");
            try {
              await onSave({ ...d, tags: cleanTags(tagInputs), title: d.title.trim(), body: d.body.trim(), link: d.link.trim() });
            } catch (err) {
              setError((err as Error).message);
              setSaving(false);
            }
          }}
        >
          <Field label="Card image" hint={imageNote || "Shown in the white box on the card. Any image works; it's resized and compressed automatically."}>
            <ImageDrop
              value={d.image}
              onFile={async (file) => {
                setImageNote("Compressing…");
                try {
                  const url = await compressImage(file);
                  setD((p) => ({ ...p, image: url, ...DEFAULT_IMAGE_SETTINGS }));
                  setImageNote(`Compressed to ${Math.round((url.length * 0.75) / 1024)} KB.`);
                } catch (err) {
                  setImageNote((err as Error).message);
                }
              }}
              onRemove={() => {
                set("image", "");
                setImageNote("");
              }}
            />
            {d.image && (
              <ImageAdjust
                value={d}
                onChange={(patch) => setD((p) => ({ ...p, ...patch }))}
              />
            )}
          </Field>
          <Field label="Tags" hint="Up to 3, shown above the heading with a dot between them. Leave any empty.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  value={tagInputs[i]}
                  placeholder={["Sixer", "Mobile", "Retention"][i]}
                  maxLength={24}
                  aria-label={`Tag ${i + 1}`}
                  onChange={(e) => {
                    const next = [...tagInputs];
                    next[i] = e.target.value;
                    setTagInputs(next);
                    set("tags", cleanTags(next));
                  }}
                  className={INPUT}
                />
              ))}
            </div>
          </Field>
          <Field label="Heading">
            <input required value={d.title} onChange={(e) => set("title", e.target.value)} className={INPUT} maxLength={90} />
          </Field>
          <Field label="Body text" hint="Shown up to 5 lines on the card.">
            <textarea required rows={4} value={d.body} onChange={(e) => set("body", e.target.value)} className={INPUT} maxLength={600} />
          </Field>
          <Field label="Card background color">
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set("background", c)}
                  className={`h-8 w-8 rounded-full ring-offset-2 ${d.background.toLowerCase() === c.toLowerCase() ? "ring-2 ring-black" : ""}`}
                  style={{ background: c, cursor: "pointer" }}
                />
              ))}
              <input type="color" value={d.background} onChange={(e) => set("background", e.target.value)} className="h-8 w-10 cursor-pointer" />
              <input
                value={d.background}
                onChange={(e) => set("background", e.target.value)}
                pattern="#[0-9a-fA-F]{6}"
                className={`${INPUT} w-28 font-mono`}
              />
            </div>
          </Field>
          <Field label="Link (opens when “View Case Study” is clicked)" hint={linkOk ? "Leave empty for no link." : "Use a full URL starting with https://"}>
            <input
              type="url"
              value={d.link}
              placeholder="https://"
              onChange={(e) => set("link", e.target.value)}
              className={`${INPUT} ${linkOk ? "" : "border-red-600"}`}
            />
          </Field>
          <Field label="Status" hint={STATUS_HINTS[d.status]}>
            <StatusPicker value={d.status} onChange={(st) => setD((p) => ({ ...p, ...statusFields(st) }))} />
          </Field>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {onDelete ? (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!window.confirm("Delete this case study? This can't be undone.")) return;
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
              <Button type="submit" disabled={saving || !linkOk}>
                {saving ? "Saving…" : isNew ? "Add case study" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_HINTS: Record<CaseStudyStatus, string> = {
  live: "Shown on the website and clickable.",
  paused: "Hidden from the website.",
  "coming-soon": "Shown on the website, not clickable, with a “Coming soon” tag instead of the link.",
};
const STATUS_COLORS: Record<CaseStudyStatus, string> = {
  live: "bg-green-600 text-white",
  paused: "bg-neutral-500 text-white",
  "coming-soon": "bg-amber-500 text-white",
};

// Live / Paused / Coming soon segmented control.
function StatusPicker({ value, onChange, small = false }: { value: CaseStudyStatus; onChange: (s: CaseStudyStatus) => void; small?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Status" className="inline-flex rounded-lg bg-black/5 p-0.5">
      {(Object.keys(STATUS_LABELS) as CaseStudyStatus[]).map((st) => (
        <button
          key={st}
          type="button"
          role="radio"
          aria-checked={value === st}
          onClick={() => value !== st && onChange(st)}
          className={`rounded-md font-semibold transition ${small ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${
            value === st ? STATUS_COLORS[st] + " shadow-sm" : "text-black/60 hover:text-black"
          }`}
          style={{ cursor: "pointer" }}
        >
          {STATUS_LABELS[st]}
        </button>
      ))}
    </div>
  );
}

type ImageSettings = Pick<Draft, "image" | "imageFit" | "imageZoom" | "imageX" | "imageY">;

// Frame / zoom / reposition the card image. The frame matches the desktop
// card's image box (516 x 440); drag the image to move its focus point.
function ImageAdjust({ value, onChange }: { value: ImageSettings; onChange: (p: Partial<ImageSettings>) => void }) {
  const [drag, setDrag] = useState<{ x: number; y: number; ix: number; iy: number; w: number; h: number } | null>(null);
  const clampPct = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-5 rounded-xl bg-black/[0.03] p-3">
      <div
        className={`relative w-64 shrink-0 touch-none overflow-hidden rounded-lg bg-white shadow-inner ${drag ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ aspectRatio: "516.33 / 440.49" }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({ x: e.clientX, y: e.clientY, ix: value.imageX, iy: value.imageY, w: r.width, h: r.height });
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          // dragging the image right reveals more of its left side
          const k = 100 / Math.max(1, value.imageZoom);
          onChange({
            imageX: clampPct(drag.ix - ((e.clientX - drag.x) / drag.w) * k),
            imageY: clampPct(drag.iy - ((e.clientY - drag.y) / drag.h) * k),
          });
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        title="Drag to reposition"
      >
        <CaseStudyImage study={value} />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Drag to move</span>
      </div>
      <div className="grid min-w-[220px] flex-1 gap-3 text-sm">
        <div className="grid gap-1">
          <span className="font-semibold">Fit</span>
          <div className="inline-flex w-max rounded-lg bg-black/5 p-0.5">
            {(
              [
                ["cover", "Fill box"],
                ["contain", "Show whole image"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ imageFit: k })}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${value.imageFit === k ? "bg-white shadow-sm" : "text-black/60"}`}
                style={{ cursor: "pointer" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="grid gap-1">
          <span className="flex justify-between font-semibold">
            Zoom <span className="tabular-nums font-normal text-black/60">{Math.round(value.imageZoom * 100)}%</span>
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={value.imageZoom}
            onChange={(e) => onChange({ imageZoom: Number(e.target.value) })}
            style={{ cursor: "pointer" }}
          />
        </label>
        <label className="grid gap-1">
          <span className="flex justify-between font-semibold">
            Left / right <span className="tabular-nums font-normal text-black/60">{Math.round(value.imageX)}%</span>
          </span>
          <input type="range" min={0} max={100} step={0.5} value={value.imageX} onChange={(e) => onChange({ imageX: Number(e.target.value) })} style={{ cursor: "pointer" }} />
        </label>
        <label className="grid gap-1">
          <span className="flex justify-between font-semibold">
            Up / down <span className="tabular-nums font-normal text-black/60">{Math.round(value.imageY)}%</span>
          </span>
          <input type="range" min={0} max={100} step={0.5} value={value.imageY} onChange={(e) => onChange({ imageY: Number(e.target.value) })} style={{ cursor: "pointer" }} />
        </label>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_IMAGE_SETTINGS)}
          className="w-max text-xs font-semibold text-black/60 underline hover:text-black"
          style={{ cursor: "pointer" }}
        >
          Reset image position
        </button>
      </div>
    </div>
  );
}

// Drop zone / picker for the card image, with a preview and replace/remove.
function ImageDrop({ value, onFile, onRemove }: { value: string; onFile: (f: File) => void; onRemove: () => void }) {
  const [over, setOver] = useState(false);
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-3 transition ${over ? "border-[#7A124F] bg-[#7A124F]/5" : "border-black/15 bg-black/[0.02]"}`}
    >
      <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-inner">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL preview
          <img src={value} alt="Card image preview" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-black/25" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 17l-5.5-5.5L5 20" />
          </svg>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 text-sm">
        <span className="text-black/60">{value ? "Drop a new image to replace it" : "Drag an image here, or"}</span>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-lg bg-black/5 px-3 py-1.5 font-semibold hover:bg-black/10">
            {value ? "Replace image" : "Choose image"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files)} />
          </label>
          {value && (
            <button type="button" onClick={onRemove} className="rounded-lg px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50" style={{ cursor: "pointer" }}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// The real site card, scaled down to `width`.
function CardThumb({ study, width, interactive = false }: { study: CaseStudy; width: number; interactive?: boolean }) {
  const s = width / CARD_WIDTH;
  return (
    <div className="shrink-0 overflow-hidden rounded-md" style={{ width, maxWidth: "100%", aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}>
      <div className={interactive ? "" : "pointer-events-none"} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <CaseStudyCard study={study} focusable={false} />
      </div>
    </div>
  );
}

