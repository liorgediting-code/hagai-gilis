export default function LessonLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="size-4 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>

      {/* Title */}
      <div className="h-8 w-3/4 rounded-lg bg-muted" />

      {/* Video 16:9 */}
      <div className="aspect-video w-full rounded-xl bg-muted" />

      {/* Description lines */}
      <div className="rounded-xl border border-border/50 bg-card px-4 py-4 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-3 w-4/6 rounded bg-muted" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <div className="h-11 w-32 rounded-lg bg-muted" />
        <div className="h-11 w-32 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
