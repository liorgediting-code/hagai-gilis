export default function SummariesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="size-6 rounded bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>

      {/* Module card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="border-b border-border/50 px-4 py-4">
          <div className="h-5 w-40 rounded bg-muted" />
        </div>
        <ul className="divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex min-h-14 items-center gap-3 px-4 py-3">
              <div className="size-4 rounded bg-muted shrink-0" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
