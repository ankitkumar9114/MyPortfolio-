"use client";

import { num, str, usePublishedCollection, type CmsItem } from "./cmsCollection";

// A channel on the "Product I Build" retro TV ("vibe coading" channel),
// stored in Firestore (collection "tvChannels") and edited in /admin.
// With a video URL the channel plays it; without one it shows `background`
// (any CSS color/gradient) with `label` on screen. `title` and
// `description` fill the set-top-box info banner shown on channel change.
export type TvChannelItem = CmsItem & {
  label: string; // on-screen text when there's no video, e.g. "NO SIGNAL"
  video: string; // direct link to an .mp4/.webm file; "" = no video
  background: string; // CSS background shown when there's no video
  title: string; // info banner: what's on, e.g. the video's name
  description: string; // info banner: a line or two about it
};

export const TV_CHANNELS_COLLECTION = "tvChannels";

// The TV's info banner shows these until a channel gets its own title /
// description in the CMS. Lengths are what fits the banner (title on one
// line, description on two).
export const TV_PLACEHOLDER_TITLE = "Vibe Coding Channel";
export const TV_PLACEHOLDER_DESCRIPTION = "A product I designed and vibe-coded end to end, from first sketch to shipped build.";
export const TV_TITLE_MAX = 32;
export const TV_DESCRIPTION_MAX = 90;

const SMPTE_BARS =
  "linear-gradient(90deg, #c0c0c0 0 14.28%, #c0c000 14.28% 28.57%, #00c0c0 28.57% 42.85%, #00c000 42.85% 57.14%, #c000c0 57.14% 71.42%, #c00000 71.42% 85.71%, #0000c0 85.71% 100%)";

// The original built-in channels.
export const DEFAULT_TV_CHANNELS: TvChannelItem[] = [
  { label: "", video: "", background: "radial-gradient(circle at 50% 50%, #9590FF 0%, #5952FF 100%)" },
  { label: "", video: "", background: SMPTE_BARS },
  { label: "NO SIGNAL", video: "", background: "#1a2fd6" },
].map((c, i) => ({ ...c, title: "", description: "", id: `default-${i + 1}`, order: i, published: true }));

export function normalizeTvChannel(id: string, d: Record<string, unknown>): TvChannelItem {
  return {
    id,
    label: str(d.label),
    video: str(d.video),
    background: str(d.background) || "#1a2fd6",
    title: str(d.title),
    description: str(d.description),
    order: num(d.order),
    published: d.published !== false,
  };
}

// A Google Drive share link (drive.google.com/file/d/<id>/view, or
// ?id=<id>) opens Drive's viewer page, not the file, and Chrome blocks
// Drive's own download URL in <video>, so Drive videos play through
// /api/drive-video (src/app/api/drive-video/route.ts), which streams the
// file from Drive. The file must be shared "Anyone with the link". Any
// other link is returned unchanged.
export function playableVideoUrl(url: string): string {
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(url)) return url;
  const id = url.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.match(/[?&]id=([\w-]+)/)?.[1];
  return id ? `/api/drive-video?id=${id}` : url;
}

export const useTvChannels =() => usePublishedCollection(TV_CHANNELS_COLLECTION, normalizeTvChannel, DEFAULT_TV_CHANNELS);
