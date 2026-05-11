export default function ExerciseLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="size-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>

      {/* Level badge */}
      <div className="h-6 w-20 rounded-full bg-muted" />

      {/* Chart area */}
      <div className="h-64 w-full rounded-xl bg-muted sm:h-80" />

      {/* Submit button */}
      <div className="h-11 w-40 rounded-lg bg-muted" />
    </div>
  );
}
