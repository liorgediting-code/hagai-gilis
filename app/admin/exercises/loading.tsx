export default function AdminExercisesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-6 rounded bg-muted" />
          <div className="h-8 w-24 rounded-lg bg-muted" />
        </div>
        <div className="h-11 w-32 rounded-lg bg-muted" />
      </div>

      {/* Exercises card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
        <ul className="divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="size-8 rounded bg-muted" />
                <div className="h-8 w-12 rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
