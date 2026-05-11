export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Heading */}
      <div className="h-8 w-28 rounded-lg bg-muted" />

      {/* Stat cards grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card px-5 py-5 space-y-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
