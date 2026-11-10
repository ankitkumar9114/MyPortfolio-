"use client";

import { useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_RESUME, RESUME_DOC_ID, parseResume, type Resume, type ResumeItem, type ResumeJob } from "@/data/resume";
import { Button, Field, IconButton, INPUT, Notice } from "./ui";

// "Resume" section of the CMS: every part of the /resume page. Saved as one
// document (settings/resume); the page shows changes within about a minute.
// Lists use one line per entry (bullets, certificates). In About Me, wrap
// words in **double asterisks** to make them bold.

const TEXTAREA = `${INPUT} min-h-[96px] leading-relaxed`;
const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-[family-name:var(--font-arvo)] text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

// a reorderable list of entries with add / remove / move controls
function ListEditor<T>({
  items,
  onChange,
  make,
  label,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  label: string;
  render: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-black/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
              {label} {i + 1}
            </span>
            <div className="flex gap-1">
              <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </IconButton>
              <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                ↓
              </IconButton>
              <IconButton label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}>
                ✕
              </IconButton>
            </div>
          </div>
          {render(it, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <div>
        <Button variant="ghost" onClick={() => onChange([...items, make()])}>
          + Add {label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

// title / text / optional link, used for links, education, achievements, skills
function ItemFields({ item, set, textLabel = "Text", withLink = true }: { item: ResumeItem; set: (p: Partial<ResumeItem>) => void; textLabel?: string; withLink?: boolean }) {
  return (
    <>
      <Field label="Title">
        <input value={item.title} onChange={(e) => set({ title: e.target.value })} className={INPUT} />
      </Field>
      <Field label={textLabel}>
        <textarea value={item.text} onChange={(e) => set({ text: e.target.value })} className={`${INPUT} min-h-[60px]`} />
      </Field>
      {withLink && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link text (optional)">
            <input value={item.link?.text ?? ""} onChange={(e) => set({ link: { text: e.target.value, href: item.link?.href ?? "" } })} className={INPUT} />
          </Field>
          <Field label="Link URL (optional)">
            <input
              type="url"
              value={item.link?.href ?? ""}
              placeholder="https://"
              onChange={(e) => set({ link: { href: e.target.value, text: item.link?.text ?? "" } })}
              className={INPUT}
            />
          </Field>
        </div>
      )}
    </>
  );
}

// the form keeps bullets / certificates as editable text (one per line)
type JobForm = Omit<ResumeJob, "points"> & { points: string };
type Form = Omit<Resume, "jobs" | "certificates"> & { jobs: JobForm[]; certificates: string };
const toForm = (r: Resume): Form => ({ ...r, jobs: r.jobs.map((j) => ({ ...j, points: j.points.join("\n") })), certificates: r.certificates.join("\n") });
const cleanItems = (list: ResumeItem[]) =>
  list
    .map((i) => {
      const href = i.link?.href.trim() ?? "";
      return { title: i.title.trim(), text: i.text.trim(), ...(href ? { link: { text: (i.link?.text.trim() || href), href } } : {}) };
    })
    .filter((i) => i.title || i.text);
const fromForm = (f: Form): Resume => ({
  name: f.name.trim(),
  role: f.role.trim(),
  experience: f.experience.trim(),
  email: f.email.trim(),
  phone: f.phone.trim(),
  about: f.about.trim(),
  jobs: f.jobs.map((j) => ({ company: j.company.trim(), meta: j.meta.trim(), points: lines(j.points) })).filter((j) => j.company),
  links: cleanItems(f.links),
  education: cleanItems(f.education),
  certificates: lines(f.certificates),
  achievements: cleanItems(f.achievements),
  skills: cleanItems(f.skills),
});

export default function ResumePanel() {
  const [form, setForm] = useState<Form | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [error, setError] = useState("");

  useEffect(
    () =>
      onSnapshot(
        doc(db()!, "settings", RESUME_DOC_ID),
        (snap) => {
          const r = parseResume(snap.data());
          setSavedJson(JSON.stringify(r));
          setForm((f) => f ?? toForm(r));
          setLoadError("");
        },
        (e) => setLoadError(e.message),
      ),
    [],
  );

  const dirty = form ? JSON.stringify(fromForm(form)) !== savedJson : false;
  const set = (patch: Partial<Form>) => {
    setStatus("");
    setForm((f) => (f ? { ...f, ...patch } : f));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-32 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-arvo)] text-3xl font-bold">Resume</h1>
          <p className="text-sm text-black/60">Everything on the resume page. Every “Resume” button on the site opens it; changes show there within about a minute.</p>
        </div>
        <a href="/resume" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold hover:bg-black/5">
          Open resume page
        </a>
      </div>

      {loadError && (
        <Notice tone="error">
          Couldn&apos;t load: {loadError}
          {/permission/i.test(loadError) && " — publish the updated firestore.rules in the Firebase console."}
        </Notice>
      )}
      {!form && !loadError && <p className="text-sm text-black/60">Loading…</p>}

      {form && (
        <form
          className="grid gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setStatus("saving");
            setError("");
            try {
              const data = fromForm(form);
              await setDoc(doc(db()!, "settings", RESUME_DOC_ID), { ...data, updatedAt: serverTimestamp() });
              setForm(toForm(data));
              setStatus("saved");
            } catch (err) {
              setError((err as Error).message);
              setStatus("");
            }
          }}
        >
          <Card title="Header">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Role">
                <input value={form.role} onChange={(e) => set({ role: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Experience" hint="Shown after the role, e.g. “3+ Years of Experience”. Leave empty to hide.">
                <input value={form.experience} onChange={(e) => set({ experience: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={INPUT} />
              </Field>
            </div>
          </Card>

          <Card title="About Me">
            <Field label="About" hint="Wrap words in **double asterisks** to make them bold.">
              <textarea value={form.about} onChange={(e) => set({ about: e.target.value })} className={`${TEXTAREA} min-h-[200px]`} />
            </Field>
          </Card>

          <Card title="Work Experience">
            <ListEditor
              items={form.jobs}
              onChange={(jobs) => set({ jobs })}
              make={() => ({ company: "", meta: "", points: "" })}
              label="Job"
              render={(j, setJ) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Company">
                      <input value={j.company} onChange={(e) => setJ({ company: e.target.value })} className={INPUT} />
                    </Field>
                    <Field label="Role | type | dates">
                      <input value={j.meta} placeholder="UI/UX Designer | Full Time | Jan’24 - Present" onChange={(e) => setJ({ meta: e.target.value })} className={INPUT} />
                    </Field>
                  </div>
                  <Field label="Bullet points" hint="One per line.">
                    <textarea value={j.points} onChange={(e) => setJ({ points: e.target.value })} className={TEXTAREA} />
                  </Field>
                </>
              )}
            />
          </Card>

          <Card title="Links">
            <ListEditor items={form.links} onChange={(links) => set({ links })} make={() => ({ title: "", text: "", link: { text: "", href: "" } })} label="Link" render={(it, s) => <ItemFields item={it} set={s} textLabel="Text (optional)" />} />
          </Card>

          <Card title="Education">
            <ListEditor items={form.education} onChange={(education) => set({ education })} make={() => ({ title: "", text: "" })} label="School" render={(it, s) => <ItemFields item={it} set={s} textLabel="Degree / dates" withLink={false} />} />
          </Card>

          <Card title="Certificates">
            <Field label="Certificates" hint="One per line.">
              <textarea value={form.certificates} onChange={(e) => set({ certificates: e.target.value })} className={TEXTAREA} />
            </Field>
          </Card>

          <Card title="Achievements">
            <ListEditor items={form.achievements} onChange={(achievements) => set({ achievements })} make={() => ({ title: "", text: "" })} label="Achievement" render={(it, s) => <ItemFields item={it} set={s} textLabel="Description" />} />
          </Card>

          <Card title="Skills">
            <ListEditor items={form.skills} onChange={(skills) => set({ skills })} make={() => ({ title: "", text: "" })} label="Skill group" render={(it, s) => <ItemFields item={it} set={s} textLabel="Skills (separate with ·)" withLink={false} />} />
          </Card>

          {error && <Notice tone="error">{error}</Notice>}

          {/* save bar, always in reach on a long form */}
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
            <span className="text-sm text-black/60">{status === "saved" && !dirty ? "Saved. The resume page updates within a minute." : dirty ? "Unsaved changes" : ""}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => set(toForm(DEFAULT_RESUME))}>
                Reset to built-in
              </Button>
              {dirty && (
                <Button variant="ghost" onClick={() => setForm(toForm(JSON.parse(savedJson) as Resume))}>
                  Discard changes
                </Button>
              )}
              <Button type="submit" disabled={!dirty || status === "saving"}>
                {status === "saving" ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
