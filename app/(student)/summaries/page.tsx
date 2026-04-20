import Link from "next/link";
import { FileTextIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleRow, LessonRow, LessonSummaryRow } from "@/lib/types/course-types";

export default async function SummariesPage() {
  await requirePageAccess("summaries");
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: modules } = (await db
    .from("modules")
    .select("*")
    .order("order_index")) as { data: ModuleRow[] | null; error: unknown };

  const { data: lessons } = (await db
    .from("lessons")
    .select("*")
    .order("order_index")) as { data: LessonRow[] | null; error: unknown };

  const { data: summaries } = (await db
    .from("lesson_summaries")
    .select("lesson_id")) as { data: Pick<LessonSummaryRow, "lesson_id">[] | null; error: unknown };

  const summaryLessonIds = new Set((summaries ?? []).map((s) => s.lesson_id));
  const lessonsWithSummary = (lessons ?? []).filter((l) => summaryLessonIds.has(l.id));
  const byModule = lessonsWithSummary.reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    if (!acc[lesson.module_id]) acc[lesson.module_id] = [];
    acc[lesson.module_id].push(lesson);
    return acc;
  }, {});

  const modulesWithSummaries = (modules ?? []).filter((m) => byModule[m.id]?.length);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <FileTextIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">סיכומים</h1>
      </div>

      {modulesWithSummaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין סיכומים זמינים.</p>
      ) : (
        <div className="space-y-6">
          {modulesWithSummaries.map((mod) => (
            <Card key={mod.id}>
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-base font-semibold">{mod.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/30">
                  {(byModule[mod.id] ?? []).map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/summaries/${lesson.id}`}
                        className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <FileTextIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground">{lesson.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
