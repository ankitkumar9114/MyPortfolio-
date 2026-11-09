import { redirect } from "next/navigation";
import { ADMIN_BASE } from "@/lib/adminPath";

// The CMS address on its own opens the first section.
export default function AdminIndex() {
  redirect(`${ADMIN_BASE}/case-studies`);
}
