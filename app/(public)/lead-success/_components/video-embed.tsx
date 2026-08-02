"use client";

import { useState } from "react";

import { PlayIcon } from "lucide-react";

const MARKERS = [1, 2, 3];

export function VideoEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="ההדרכה המלאה: שיטת 5 האזורים הבטוחים"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="נגן את הסרטון"
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-secondary via-muted to-background ring-1 ring-foreground/10"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-lg sm:size-20">
          <PlayIcon
            className="size-8 fill-neutral-900 text-neutral-900 sm:size-10"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-6 sm:gap-10">
        {MARKERS.map((n) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-neutral-900 ring-1 ring-black/10">
              {n}
            </div>
            <span className="text-[10px] text-white/90 sm:text-xs">לעולם אל תפסיד</span>
          </div>
        ))}
      </div>
    </button>
  );
}
