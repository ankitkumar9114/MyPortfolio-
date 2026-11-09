"use client";

import {
  DEFAULT_TV_CHANNELS,
  TV_CHANNELS_COLLECTION,
  TV_DESCRIPTION_MAX,
  TV_PLACEHOLDER_DESCRIPTION,
  TV_PLACEHOLDER_TITLE,
  TV_TITLE_MAX,
  normalizeTvChannel,
  playableVideoUrl,
  type TvChannelItem,
} from "@/lib/tvChannels";
import { InfoBanner } from "@/components/sections/TvScreen";
import ListPanel from "./ListPanel";
import { Field, INPUT } from "./ui";

type Draft = Omit<TvChannelItem, "id" | "order">;

const PRESETS: [string, string][] = [
  ["Purple glow", "radial-gradient(circle at 50% 50%, #9590FF 0%, #5952FF 100%)"],
  ["Color bars", DEFAULT_TV_CHANNELS[1].background],
  ["Blue screen", "#1a2fd6"],
  ["Black", "#000000"],
];

// "Vibe Coding channel" section of the CMS: the channels on the retro TV.
export default function TvChannelsPanel() {
  return (
    <ListPanel<TvChannelItem>
      title="Vibe Coding channel"
      description="The channels on the retro TV in “Product I Build”. Previous / Next on the TV step through them in this order."
      itemName="channel"
      collectionName={TV_CHANNELS_COLLECTION}
      normalize={normalizeTvChannel}
      defaults={DEFAULT_TV_CHANNELS}
      emptyDraft={{ label: "", video: "", background: "#1a2fd6", title: "", description: "", published: true }}
      renderPreview={(c) => <Screen channel={c} />}
      renderSummary={(c) => (
        <>
          <p className={`truncate font-semibold ${c.title ? "" : "text-black/40"}`}>{c.title || `${TV_PLACEHOLDER_TITLE} (placeholder title)`}</p>
          <p className="truncate text-sm text-black/70">{c.video ? c.video : c.label ? `“${c.label}” on ${describe(c.background)}` : describe(c.background)}</p>
        </>
      )}
      validate={(d) => (d.video && !/^https?:\/\/\S+$/i.test(d.video) && !d.video.startsWith("/") ? "Video must be a full link (https://…) or a /videos/… path." : null)}
      renderFields={(d, set) => (
        <>
          <Field
            label="Video link"
            hint="A Google Drive share link (set to “Anyone with the link”), a direct link to an .mp4 or .webm file, or /videos/name.mp4 for a file in public/videos. YouTube links don't work here. Leave empty for a still screen."
          >
            <input type="text" value={d.video} placeholder="https://…/my-video.mp4" onChange={(e) => set({ video: e.target.value.trim() })} className={INPUT} />
          </Field>
          <div className="grid gap-4 rounded-xl border border-black/10 p-4">
            <div>
              <p className="text-sm font-semibold">Info banner</p>
              <p className="text-xs text-black/60">
                Comes up at the bottom of the TV for a few seconds when this channel is tuned in. The date and time are filled in automatically.
                Leave a box empty to show the grey placeholder text.
              </p>
            </div>
            <Field label="Video title" hint={`${d.title.length}/${TV_TITLE_MAX} characters`}>
              <input
                value={d.title}
                maxLength={TV_TITLE_MAX}
                placeholder={TV_PLACEHOLDER_TITLE}
                onChange={(e) => set({ title: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Description" hint={`${d.description.length}/${TV_DESCRIPTION_MAX} characters, shown on up to two lines`}>
              <textarea
                rows={2}
                value={d.description}
                maxLength={TV_DESCRIPTION_MAX}
                placeholder={TV_PLACEHOLDER_DESCRIPTION}
                onChange={(e) => set({ description: e.target.value })}
                className={INPUT}
              />
            </Field>
            <BannerPreview channel={d} />
          </div>
          {!d.video && (
            <>
              <Field label="Screen text" hint="Shown in the middle of the screen, e.g. “NO SIGNAL”. Optional.">
                <input value={d.label} maxLength={24} onChange={(e) => set({ label: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Screen background" hint="Pick a preset or enter any CSS color / gradient.">
                <div className="grid gap-2">
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(([name, bg]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => set({ background: bg })}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs font-semibold ${d.background === bg ? "border-black" : "border-black/15"}`}
                        style={{ cursor: "pointer" }}
                      >
                        <span className="h-5 w-7 rounded" style={{ background: bg }} />
                        {name}
                      </button>
                    ))}
                  </div>
                  <input value={d.background} onChange={(e) => set({ background: e.target.value })} className={`${INPUT} font-mono text-xs`} />
                </div>
              </Field>
            </>
          )}
        </>
      )}
    />
  );
}

function describe(bg: string) {
  return PRESETS.find(([, b]) => b === bg)?.[0] ?? bg;
}

// A small TV screen showing the channel the way the site does.
function Screen({ channel }: { channel: Draft }) {
  return (
    <div className="relative h-[120px] w-[200px] overflow-hidden rounded-[14px] border-4 border-[#2a2420] bg-black shadow-inner">
      {channel.video ? (
        <video src={playableVideoUrl(channel.video)} className="h-full w-full object-cover" muted autoPlay loop playsInline />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ background: channel.background }}>
          {channel.label && <span className="font-mono text-sm font-bold tracking-widest text-white">{channel.label}</span>}
        </div>
      )}
    </div>
  );
}

// The TV's info banner as it will look, over a dark stand-in screen.
function BannerPreview({ channel }: { channel: Draft }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">Preview</p>
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg"
        style={{ containerType: "inline-size", background: channel.video ? "#1d1d22" : channel.background }}
      >
        <InfoBanner showing={1} number={1} title={channel.title} description={channel.description} />
      </div>
    </div>
  );
}
