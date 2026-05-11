const widths = ["w-full", "w-11/12", "w-10/12", "w-9/12", "w-8/12", "w-7/12"];
const widths2 = ["w-full", "w-10/12", "w-9/12", "w-8/12"];

export default function SummaryDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="size-4 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>

      {/* Title */}
      <div className="h-8 w-2/3 rounded-lg bg-muted" />

      {/* Content card */}
      <div className="rounded-xl border border-border/50 bg-card px-4 py-6 space-y-3">
        {widths.map((w, i) => (
          <div key={i} className={`h-3 rounded bg-muted ${w}`} />
        ))}
        <div className="pt-3 space-y-2">
          {widths2.map((w, i) => (
            <div key={i} className={`h-3 rounded bg-muted ${w}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
