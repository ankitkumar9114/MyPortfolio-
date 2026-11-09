"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

// A case study card, as stored in Firestore (collection "caseStudies") and
// edited in the /admin CRM.
export type CaseStudy = {
  id: string;
  tags: string[]; // small labels above the heading, e.g. ["Sixer", "Mobile"]
  title: string; // card heading
  body: string; // card body text
  image: string; // card image: a compressed data URL (or any image URL); "" = blank
  imageFit: "cover" | "contain"; // cover = fill the box (cropped), contain = show the whole image
  imageZoom: number; // 1 = no zoom
  imageX: number; // focus point, 0-100 (%), used for cropping and zooming
  imageY: number;
  background: string; // card background color, e.g. "#7A124F"
  link: string; // where "View Case Study" goes; "" = no link
  order: number; // position in the carousel, lowest first
  published: boolean; // shown on the site (derived from status; what the Firestore rules check)
  status: CaseStudyStatus;
};

// live: shown + clickable · paused: hidden from the site · coming-soon: shown,
// not clickable, with a "Coming soon" tag instead of "View Case Study →".
export type CaseStudyStatus = "live" | "paused" | "coming-soon";
export const STATUS_LABELS: Record<CaseStudyStatus, string> = { live: "Live", paused: "Paused", "coming-soon": "Coming soon" };
// `published` is kept in sync so the public query/rules keep working.
export const statusFields = (status: CaseStudyStatus) => ({ status, published: status !== "paused" });

export const CASE_STUDIES_COLLECTION = "caseStudies";

export const DEFAULT_IMAGE_SETTINGS = { imageFit: "cover" as const, imageZoom: 1, imageX: 50, imageY: 50 };

const PLACEHOLDER_TITLE = "The primary goal of this tool was to replace the";
const PLACEHOLDER_BODY =
  "The primary goal of this tool was to replace the chaotic manual process (Google Forms + Excel) with a streamlined internal web app that integrates directly with our CRM, ensuring structured data and faster service delivery.";

// What the site shows until Firebase has published case studies (or if it
// can't be reached): the original placeholder cards.
export const DEFAULT_CASE_STUDIES: CaseStudy[] = ["#3B1F87", "#7A124F", "#0F6B5C", "#C97B2E", "#2B4C7E"].map(
  (background, i) => ({
    id: `default-${i + 1}`,
    tags: [],
    title: PLACEHOLDER_TITLE,
    body: PLACEHOLDER_BODY,
    image: "",
    ...DEFAULT_IMAGE_SETTINGS,
    background,
    link: "",
    order: i,
    published: true,
    status: "live" as const,
  }),
);

export function normalizeCaseStudy(id: string, d: Record<string, unknown>): CaseStudy {
  return {
    id,
    tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim()) : [],
    title: typeof d.title === "string" ? d.title : "",
    body: typeof d.body === "string" ? d.body : "",
    image: typeof d.image === "string" ? d.image : "",
    imageFit: d.imageFit === "contain" ? "contain" : "cover",
    imageZoom: typeof d.imageZoom === "number" ? Math.min(4, Math.max(1, d.imageZoom)) : 1,
    imageX: typeof d.imageX === "number" ? Math.min(100, Math.max(0, d.imageX)) : 50,
    imageY: typeof d.imageY === "number" ? Math.min(100, Math.max(0, d.imageY)) : 50,
    background: typeof d.background === "string" && d.background ? d.background : "#7A124F",
    link: typeof d.link === "string" ? d.link : "",
    order: typeof d.order === "number" ? d.order : 0,
    published: d.published !== false,
    status:
      d.status === "live" || d.status === "paused" || d.status === "coming-soon"
        ? d.status
        : d.published === false
          ? "paused"
          : "live",
  };
}

// Published case studies, live from Firestore (updates as soon as you save in
// /admin). Falls back to DEFAULT_CASE_STUDIES while loading, when Firebase
// isn't configured, on error, or when nothing is published yet.
export function useCaseStudies(): CaseStudy[] {
  const [studies, setStudies] = useState<CaseStudy[] | null>(null);
  useEffect(() => {
    const firestore = db();
    if (!firestore) return;
    // single equality filter (no composite index needed); sorted here
    const q = query(collection(firestore, CASE_STUDIES_COLLECTION), where("published", "==", true));
    return onSnapshot(
      q,
      (snap) => setStudies(snap.docs.map((d) => normalizeCaseStudy(d.id, d.data())).sort((a, b) => a.order - b.order)),
      (err) => {
        console.warn("Case studies: using built-in cards,", err.message);
        setStudies(null);
      },
    );
  }, []);
  return studies && studies.length ? studies : DEFAULT_CASE_STUDIES;
}

// Shrinks an uploaded image to a compact WebP data URL (max width/height
// `max`, under ~`maxBytes`) so it can live inside the Firestore document
// (1 MB limit) without needing Cloud Storage, which requires the paid plan.
export async function compressImage(file: File, max = 1200, maxBytes = 450_000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.75, 0.65]) {
      const url = canvas.toDataURL("image/webp", q);
      if (url.length * 0.75 <= maxBytes) return url;
    }
    scale *= 0.8;
  }
  throw new Error("Image is too large even after compressing. Try a smaller image.");
}
