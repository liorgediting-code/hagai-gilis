"use client";

import { useState } from "react";

import { PlayIcon } from "lucide-react";

export function VideoEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  // maxresdefault isn't generated for every video — fall back to the thumbnail YouTube always provides.
  const [thumbnailSrc, setThumbnailSrc] = useState(
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  );

  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg ring-1 ring-black/10">
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
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-black/10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, not a local asset */}
      <img
        src={thumbnailSrc}
        onError={() => setThumbnailSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)}
        alt="תצוגה מקדימה של הסרטון"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-lg sm:size-20">
          <PlayIcon
            className="size-8 fill-neutral-900 text-neutral-900 sm:size-10"
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  );
}
