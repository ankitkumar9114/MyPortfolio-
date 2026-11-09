"use client";

import { useSettingsDoc } from "./cmsCollection";
import { RESUME_URL } from "./resume";

// Contact details shown in the footer (email, phone, WhatsApp) plus the
// resume link (menu, footer and bottom nav), stored in Firestore as
// settings/contact and edited in /admin.
export type ContactDetails = {
  email: string;
  phone: string; // as displayed, e.g. "+91 7024396102"
  whatsapp: string; // wa.me number: country code + number, digits only
  resume: string; // link to the resume, e.g. a Google Drive share link
};

export const DEFAULT_CONTACT: ContactDetails = {
  email: "ankitiwari3105@gmail.com",
  phone: "+91 7024396102",
  whatsapp: "917024396102",
  resume: RESUME_URL,
};

export const CONTACT_DOC_ID = "contact";

export const useContactDetails = () => useSettingsDoc(CONTACT_DOC_ID, DEFAULT_CONTACT);
