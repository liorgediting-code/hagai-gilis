export default function HomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting */}
      <div className="h-8 w-48 rounded-lg bg-muted" />

      {/* Continue card */}
      <div className="rounded-xl bg-primary/20 p-5 space-y-3">
        <div className="h-3 w-32 rounded bg-primary/30" />
        <div className="h-5 w-56 rounded bg-primary/30" />
        <div className="h-10 w-32 rounded-lg bg-primary/30" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>

      {/* Quick nav grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-h-20 rounded-xl bg-card" />
        <div className="min-h-20 rounded-xl bg-card" />
      </div>
    </div>
  );
}
