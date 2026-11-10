"use client";

import { useSettingsDoc } from "./cmsCollection";

// Contact details shown in the footer (email, phone, WhatsApp), stored in
// Firestore as settings/contact and edited in /admin. (Resume buttons open
// the /resume page, see resume.ts.)
export type ContactDetails = {
  email: string;
  phone: string; // as displayed, e.g. "+91 7024396102"
  whatsapp: string; // wa.me number: country code + number, digits only
};

export const DEFAULT_CONTACT: ContactDetails = {
  email: "ankitiwari3105@gmail.com",
  phone: "+91 7024396102",
  whatsapp: "917024396102",
};

export const CONTACT_DOC_ID = "contact";

export const useContactDetails = () => useSettingsDoc(CONTACT_DOC_ID, DEFAULT_CONTACT);
