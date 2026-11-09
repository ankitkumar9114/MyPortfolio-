import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Portfolio CMS",
  robots: { index: false, follow: false },
};

// data-admin: tells globals.css to keep the normal OS cursor here.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin className="min-h-screen bg-[#F4F2EE] font-[family-name:var(--font-manrope)] text-[#1E1B18]">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
