export default function AdminMarketLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Heading row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-6 rounded bg-muted" />
          <div className="h-8 w-36 rounded-lg bg-muted" />
        </div>
        <div className="h-11 w-28 rounded-lg bg-muted" />
      </div>

      {/* Posts card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <ul className="divide-y divide-border/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-16 rounded-lg bg-muted" />
                <div className="h-9 w-12 rounded-lg bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
