export default function StudentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Heading row */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-28 rounded-lg bg-muted" />
        <div className="h-11 w-32 rounded-lg bg-muted" />
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
