"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsInitial } from "./cmsServer";

// Carries the CMS content the server fetched (cmsServer.ts) down to the CMS
// hooks, so they render it straight away instead of the built-in defaults
// while Firestore connects.
const CmsInitialContext = createContext<CmsInitial>({ collections: {}, settings: {} });

export function CmsInitialProvider({ value, children }: { value: CmsInitial; children: ReactNode }) {
  return <CmsInitialContext.Provider value={value}>{children}</CmsInitialContext.Provider>;
}

export const useCmsInitial = () => useContext(CmsInitialContext);
