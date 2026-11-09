"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { ADMIN_EMAIL, firebaseApp, firebaseConfigured } from "@/lib/firebase";
import { ADMIN_BASE } from "@/lib/adminPath";
import { Button, Centered, Field, INPUT } from "./ui";

// Sections of the CMS, in sidebar order. Each is a route under /admin.
export const ADMIN_SECTIONS = [
  { href: `${ADMIN_BASE}/case-studies`, label: "Case studies", icon: "M4 6h16v12H4zM4 10h16" },
  { href: `${ADMIN_BASE}/impact-in-numbers`, label: "Impact in Numbers", icon: "M5 19V11M12 19V5M19 19v-6" },
  { href: `${ADMIN_BASE}/vibe-coding-channel`, label: "Vibe Coding channel", icon: "M4 6h16v12H4zM10 9.5v5l4.5-2.5z" },
  { href: `${ADMIN_BASE}/linkedin`, label: "LinkedIn", icon: "M5 9v10M5 5v.01M10 19v-6a3 3 0 016 0v6M10 9v10" },
  { href: `${ADMIN_BASE}/contact-details`, label: "Contact details", icon: "M4 6h16v12H4zM4 7l8 6 8-6" },
] as const;

// Gate for every /admin page: Firebase sign-in (admin email only), then the
// sidebar layout around the section's page.
export default function AdminShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const app = firebaseApp();
    if (!app) return;
    return onAuthStateChanged(getAuth(app), setUser);
  }, []);

  if (!firebaseConfigured) {
    return <Centered>Firebase isn&apos;t configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local and restart the dev server.</Centered>;
  }
  if (user === undefined) return <Centered>Loading…</Centered>;
  if (!user) return <SignIn />;
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return (
      <Centered>
        <p className="mb-4">
          {user.email} doesn&apos;t have access to this CRM.
        </p>
        <Button onClick={() => signOut(getAuth(firebaseApp()!))}>Sign out</Button>
      </Centered>
    );
  }
  return <SidebarLayout email={user.email ?? ""}>{children}</SidebarLayout>;
}

// Email + password sign-in for the single admin account (created in the
// Firebase console; there's no sign-up here).
function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Centered>
      <form
        className="w-full max-w-sm rounded-2xl bg-white p-8 text-left shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setNote("");
          setBusy(true);
          try {
            await signInWithEmailAndPassword(getAuth(firebaseApp()!), email.trim(), password);
          } catch (err) {
            const code = (err as { code?: string }).code ?? "";
            setError(
              code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
                ? "Wrong email or password."
                : code === "auth/operation-not-allowed"
                  ? "Email/password sign-in isn't enabled yet in Firebase (Authentication → Sign-in method)."
                  : code === "auth/too-many-requests"
                    ? "Too many attempts. Wait a few minutes and try again."
                    : (err as Error).message,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="mb-1 text-center font-[family-name:var(--font-arvo)] text-3xl font-bold">Portfolio CMS</h1>
        <p className="mb-6 text-center text-sm text-black/60">Admin login</p>
        <Field label="Email">
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </Field>
        <div className="h-3" />
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </Field>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        {note && <p className="mt-4 text-sm text-green-800">{note}</p>}
        <div className="mt-6 flex items-center justify-between gap-3">
          {/* only offered once the admin's own email is typed in */}
          {email.trim().toLowerCase() === ADMIN_EMAIL ? (
            <button
              type="button"
              className="text-sm text-black/60 underline hover:text-black"
              style={{ cursor: "pointer" }}
              onClick={async () => {
                setError("");
                setNote("");
                try {
                  await sendPasswordResetEmail(getAuth(firebaseApp()!), ADMIN_EMAIL);
                  setNote(`Password reset email sent to ${ADMIN_EMAIL}.`);
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              Forgot password?
            </button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </Centered>
  );
}

function SidebarLayout({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer
  return (
    <div className="flex min-h-screen">
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-[#F4F2EE] px-4 md:hidden">
        <span className="font-[family-name:var(--font-arvo)] text-lg font-bold">Portfolio CMS</span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Menu" className="rounded-lg p-2 hover:bg-black/5" style={{ cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/10 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pb-4 pt-6">
          <p className="font-[family-name:var(--font-arvo)] text-xl font-bold">Portfolio CMS</p>
          <p className="mt-0.5 truncate text-xs text-black/50">{email}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="CMS sections">
          {ADMIN_SECTIONS.map((s) => {
            const active = pathname === s.href || pathname.startsWith(s.href + "/");
            return (
              <Link
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-[#7A124F] text-white" : "text-black/70 hover:bg-black/5 hover:text-black"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={s.icon} />
                </svg>
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-black/10 p-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex rounded-lg px-3 py-2 text-sm text-black/60 hover:bg-black/5 hover:text-black">
            View website ↗
          </a>
          <button
            type="button"
            onClick={() => signOut(getAuth(firebaseApp()!))}
            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-black/60 hover:bg-black/5 hover:text-black"
            style={{ cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
