"use client";

import { useState } from "react";
import {
  DEFAULT_LINKEDIN_POSTS,
  LINKEDIN_POSTS_COLLECTION,
  linkedinEmbedUrl,
  normalizeLinkedinPost,
  parseLinkedinInput,
  type LinkedinPostItem,
} from "@/lib/linkedinPosts";
import ListPanel from "./ListPanel";
import { Field, INPUT } from "./ui";

type Draft = Omit<LinkedinPostItem, "id" | "order">;

// "LinkedIn" section of the CMS: the posts scrolling in the purple section.
export default function LinkedinPanel() {
  return (
    <ListPanel<LinkedinPostItem>
      title="LinkedIn"
      description="The LinkedIn posts scrolling in the purple “Place Where I Dump My Ideas” section."
      itemName="post"
      collectionName={LINKEDIN_POSTS_COLLECTION}
      normalize={normalizeLinkedinPost}
      defaults={DEFAULT_LINKEDIN_POSTS}
      emptyDraft={{ urn: "", height: 600, published: true }}
      renderPreview={(post) => <PostPreview post={post} />}
      renderSummary={(post) => (
        <a href={`https://www.linkedin.com/feed/update/${post.urn}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-blue-700 underline">
          {post.urn}
        </a>
      )}
      validate={(d) => (d.urn ? null : "Paste the post's embed code or link above.")}
      renderFields={(d, set) => <PostFields draft={d} set={set} />}
    />
  );
}

// Paste the embed code (or a link) and the post id and height are picked up
// from it automatically; they're shown read-only, with a manual override
// tucked behind "Edit manually" for the rare case it's needed.
function PostFields({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState("");
  const [manual, setManual] = useState(false);
  return (
    <>
      <Field
        label="Embed code or post link"
        hint={
          note ||
          "On LinkedIn open the post → ••• → Embed this post → copy the code and paste it here. The post and its height are filled in automatically."
        }
      >
        <textarea
          rows={3}
          value={paste}
          placeholder='<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:…" height="602" …>'
          onChange={(e) => {
            setPaste(e.target.value);
            const parsed = parseLinkedinInput(e.target.value);
            if (!e.target.value.trim()) return setNote("");
            if (!parsed) return setNote("Couldn't find a post in that. Paste the embed code or the post's link.");
            set({ urn: parsed.urn, ...(parsed.height ? { height: parsed.height } : {}) });
            setNote(
              parsed.height
                ? "Got it: the post and its height were filled in."
                : "Got the post. A plain link has no height, so the last height is kept; paste the embed code instead for an exact fit.",
            );
          }}
          className={`${INPUT} font-mono text-xs`}
        />
      </Field>
      {draft.urn && !manual && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-black/5 px-3 py-2 text-xs text-black/60">
          <span>
            Detected: <span className="font-mono">{draft.urn}</span> · {draft.height}px tall
          </span>
          <button type="button" onClick={() => setManual(true)} className="font-semibold text-black/70 underline" style={{ cursor: "pointer" }}>
            Edit manually
          </button>
        </p>
      )}
      {!draft.urn && !manual && (
        <button type="button" onClick={() => setManual(true)} className="justify-self-start text-xs font-semibold text-black/60 underline" style={{ cursor: "pointer" }}>
          Enter the post id and height manually instead
        </button>
      )}
      {manual && (
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Post id">
            <input value={draft.urn} onChange={(e) => set({ urn: e.target.value.trim() })} className={`${INPUT} font-mono text-xs`} />
          </Field>
          <Field label="Height (px)" hint="From the embed code.">
            <input
              type="number"
              min={200}
              max={1400}
              value={draft.height}
              onChange={(e) => set({ height: Number(e.target.value) || 600 })}
              className={INPUT}
            />
          </Field>
        </div>
      )}
    </>
  );
}

// The real LinkedIn embed, scaled down.
function PostPreview({ post }: { post: Draft }) {
  const scale = 0.4;
  if (!post.urn) {
    return <div className="flex h-[120px] w-[202px] items-center justify-center rounded-lg bg-white text-xs text-black/40">No post yet</div>;
  }
  return (
    <div className="overflow-hidden rounded-lg bg-white" style={{ width: 504 * scale, height: Math.min(post.height, 700) * scale }}>
      <iframe
        src={linkedinEmbedUrl(post.urn)}
        title="LinkedIn post preview"
        width={504}
        height={post.height}
        loading="lazy"
        className="pointer-events-none origin-top-left border-0"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
