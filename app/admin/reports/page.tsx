import { BugIcon } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";
import { DeleteReportButton } from "./_components/delete-report-button";

type BugReportRow = Tables<"bug_reports">;
type ReporterProfile = { id: string; full_name: string | null; email: string };

const CATEGORY_LABELS: Record<string, string> = {
  lessons: "שיעורים",
  exercises: "תרגילים",
  summaries: "סיכומים",
  market: "מניות",
  other: "אחר",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = asUntyped(await createClient());

  const { data: reports } = (await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false })) as { data: BugReportRow[] | null };

  const list = reports ?? [];
  const userIds = Array.from(new Set(list.map((r) => r.user_id)));

  const { data: profiles } = userIds.length
    ? ((await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)) as { data: ReporterProfile[] | null })
    : { data: [] as ReporterProfile[] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BugIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">דיווחי תקלות</h1>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין דיווחים כרגע.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const p = profileMap.get(r.user_id);
            return (
              <li key={r.id}>
                <Card>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {CATEGORY_LABELS[r.category] ?? r.category}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {p?.full_name ?? "תלמיד"}
                        </span>
                        {p?.email && (
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {p.email}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-foreground">{r.description}</p>

                    {(r.page_url || r.user_agent) && (
                      <div className="space-y-1 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                        {r.page_url && (
                          <p className="truncate">
                            עמוד:{" "}
                            <span dir="ltr" className="font-mono">
                              {r.page_url}
                            </span>
                          </p>
                        )}
                        {r.user_agent && (
                          <p className="truncate">
                            מכשיר:{" "}
                            <span dir="ltr" className="font-mono">
                              {r.user_agent}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <DeleteReportButton id={r.id} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
