export default function MarketLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-6 rounded bg-muted" />
        <div className="h-8 w-32 rounded-lg bg-muted" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="border-b border-border/50 px-4 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted shrink-0" />
              </div>
            </div>
            <div className="px-4 pt-4 pb-5 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-3 w-4/6 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
