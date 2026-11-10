"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CONTACT_DOC_ID, DEFAULT_CONTACT, type ContactDetails } from "@/lib/contactDetails";
import { Button, Field, INPUT, Notice } from "./ui";

// "Contact details" section of the CMS: the email / phone / WhatsApp shown
// on the footer's table (and used by the computer and telephone props). The
// resume itself is edited under "Resume".
export default function ContactPanel() {
  const [form, setForm] = useState<ContactDetails | null>(null);
  const [saved, setSaved] = useState<ContactDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [error, setError] = useState("");

  useEffect(
    () =>
      onSnapshot(
        doc(db()!, "settings", CONTACT_DOC_ID),
        (snap) => {
          const d = { ...DEFAULT_CONTACT, ...(snap.data() as Partial<ContactDetails> | undefined) };
          setSaved(d);
          setForm((f) => f ?? d);
          setLoadError("");
        },
        (e) => setLoadError(e.message),
      ),
    [],
  );

  const digits = (form?.whatsapp ?? "").replace(/\D/g, "");
  const emailOk = !form || /^\S+@\S+\.\S+$/.test(form.email);
  const waOk = digits.length >= 10 && digits.length <= 15;
  const dirty =
    form && saved && (form.email !== saved.email || form.phone !== saved.phone || form.whatsapp !== saved.whatsapp);
  const set = (k: keyof ContactDetails, v: string) => {
    setStatus("");
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <h1 className="font-[family-name:var(--font-arvo)] text-3xl font-bold">Contact details</h1>
      <p className="mb-8 text-sm text-black/60">
        Shown on the footer&apos;s table: the email and phone lines, the computer (“Mail me”) and the telephone (“WhatsApp me”). The resume is
        edited under “Resume”.
      </p>

      {loadError && (
        <Notice tone="error">
          Couldn&apos;t load: {loadError}
          {/permission/i.test(loadError) && " — publish the updated firestore.rules in the Firebase console."}
        </Notice>
      )}
      {!form && !loadError && <p className="text-sm text-black/60">Loading…</p>}

      {form && (
        <form
          className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!emailOk || !waOk) return;
            setStatus("saving");
            setError("");
            try {
              const data = { email: form.email.trim(), phone: form.phone.trim(), whatsapp: digits };
              await setDoc(doc(db()!, "settings", CONTACT_DOC_ID), { ...data, updatedAt: serverTimestamp() });
              setForm(data);
              setStatus("saved");
            } catch (err) {
              setError((err as Error).message);
              setStatus("");
            }
          }}
        >
          <Field label="Email" hint={emailOk ? "Shown on the table and opened by the computer." : "Enter a valid email address."}>
            <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Phone number" hint="Shown on the table exactly as you type it, e.g. +91 7024396102.">
            <input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} />
          </Field>
          <Field
            label="WhatsApp number"
            hint={waOk ? `The telephone opens wa.me/${digits}. Country code + number; spaces and + are removed.` : "Use country code + number, e.g. 917024396102."}
          >
            <div className="flex gap-2">
              <input type="tel" required value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={INPUT} />
              <Button variant="ghost" onClick={() => set("whatsapp", form.phone)}>
                Same as phone
              </Button>
            </div>
          </Field>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-black/60">{status === "saved" && !dirty ? "Saved. The footer now shows these details." : ""}</span>
            <div className="flex gap-2">
              {dirty && (
                <Button variant="ghost" onClick={() => setForm(saved)}>
                  Discard changes
                </Button>
              )}
              <Button type="submit" disabled={!dirty || status === "saving" || !emailOk || !waOk}>
                {status === "saving" ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
