export default function ExercisesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="size-6 rounded bg-muted" />
        <div className="h-8 w-36 rounded-lg bg-muted" />
      </div>

      {/* Lesson cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
              <div className="size-7 rounded-lg bg-muted shrink-0" />
              <div className="h-4 flex-1 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted shrink-0" />
            </div>
            {i < 2 && (
              <ul className="divide-y divide-border/30">
                {Array.from({ length: 2 }).map((_, j) => (
                  <li key={j} className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <div className="size-5 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
