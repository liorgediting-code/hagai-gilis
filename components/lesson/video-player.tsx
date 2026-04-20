import { PlayIcon } from "lucide-react";

interface VideoPlayerProps {
  videoUrl?: string | null;
}

export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  if (videoUrl) {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <iframe
          src={videoUrl}
          className="w-full aspect-video"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="סרטון שיעור"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-card ring-1 ring-border/50">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/15">
        <PlayIcon className="size-8 text-primary" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">הווידאו יעלה בקרוב</p>
    </div>
  );
}
