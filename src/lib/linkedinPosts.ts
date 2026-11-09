"use client";

import { num, str, usePublishedCollection, type CmsItem } from "./cmsCollection";

// A LinkedIn post embedded in the purple "Place Where I Dump My Ideas"
// section, stored in Firestore (collection "linkedinPosts") and edited in
// /admin.
export type LinkedinPostItem = CmsItem & {
  urn: string; // e.g. "urn:li:share:7466321111849377792"
  height: number; // embed height in px at LinkedIn's 504px width
};

export const LINKEDIN_POSTS_COLLECTION = "linkedinPosts";

// The original built-in posts.
export const DEFAULT_LINKEDIN_POSTS: LinkedinPostItem[] = [
  { urn: "urn:li:ugcPost:7462015235185483776", height: 549 },
  { urn: "urn:li:share:7466321111849377792", height: 602 },
  { urn: "urn:li:ugcPost:7460991869745790977", height: 627 },
  { urn: "urn:li:ugcPost:7459577032763543552", height: 549 },
  { urn: "urn:li:ugcPost:7458164491361468416", height: 549 },
  { urn: "urn:li:share:7455142902931951616", height: 668 },
].map((p, i) => ({ ...p, id: `default-${i + 1}`, order: i, published: true }));

export function normalizeLinkedinPost(id: string, d: Record<string, unknown>): LinkedinPostItem {
  return { id, urn: str(d.urn), height: Math.min(1400, Math.max(200, num(d.height, 600))), order: num(d.order), published: d.published !== false };
}

export const useLinkedinPosts = () => usePublishedCollection(LINKEDIN_POSTS_COLLECTION, normalizeLinkedinPost, DEFAULT_LINKEDIN_POSTS);

export const linkedinEmbedUrl = (urn: string) => `https://www.linkedin.com/embed/feed/update/${urn}?collapsed=1`;

// Pulls the post id and height out of whatever is pasted: LinkedIn's "Embed
// this post" code (<iframe src=".../urn:li:share:123" height="602" ...>, the
// most reliable option), an embed URL, or a post URL containing a urn or an
// "activity-123" id.
export function parseLinkedinInput(text: string): { urn: string; height?: number } | null {
  const urn = text.match(/urn:li:(?:share|ugcPost|activity):\d+/)?.[0];
  const activity = text.match(/activity[-:](\d{10,})/)?.[1];
  const id = urn ?? (activity ? `urn:li:activity:${activity}` : null);
  if (!id) return null;
  const h = text.match(/height=["']?(\d{3,4})/)?.[1];
  return { urn: id, height: h ? Number(h) : undefined };
}
