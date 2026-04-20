"use client";

import { useSearchParams } from "next/navigation";

const pageLabels: Record<string, string> = {
  lessons: "שיעורים",
  exercises: "תרגולים",
  summaries: "סיכומים",
};

export function BlockedBanner() {
  const searchParams = useSearchParams();
  const blocked = searchParams.get("blocked");

  if (!blocked) return null;

  const pageLabel = pageLabels[blocked] ?? blocked;

  return (
    <div
      role="alert"
      className="bg-destructive/15 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive mx-4 mt-4"
    >
      <span className="font-semibold">גישה נחסמה לעמוד {pageLabel}. </span>
      הגישה לעמוד זה נחסמה על ידי המנהל. פנה אל חגי להסרת החסימה.
    </div>
  );
}
