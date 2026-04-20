import Link from "next/link";
import { FileTextIcon, PencilIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleRow, LessonRow, LessonSummaryRow } from "@/lib/types/course-types";

export default async function AdminSummariesPage() {
  await requireAdmin();
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

  const summaryIds = new Set((summaries ?? []).map((s) => s.lesson_id));
  const allLessons = lessons ?? [];

  const byModule = allLessons.reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    if (!acc[lesson.module_id]) acc[lesson.module_id] = [];
    acc[lesson.module_id].push(lesson);
    return acc;
  }, {});

  const modulesWithLessons = (modules ?? []).filter((m) => (byModule[m.id] ?? []).length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileTextIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">סיכומים</h1>
      </div>

      {modulesWithLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          עדיין אין מודולים עם שיעורים.{" "}
          <Link href="/admin/modules" className="text-primary hover:underline">
            צור מודול ושיעורים תחילה.
          </Link>
        </p>
      ) : (
        <div className="space-y-6">
          {modulesWithLessons.map((mod) => (
            <Card key={mod.id}>
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-base font-semibold">{mod.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/30">
                  {(byModule[mod.id] ?? []).map((lesson) => {
                    const hasSummary = summaryIds.has(lesson.id);
                    return (
                      <li key={lesson.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{lesson.title}</span>
                          {hasSummary ? (
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              יש סיכום
                            </span>
                          ) : (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              אין סיכום
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/admin/summaries/${lesson.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                        >
                          <PencilIcon className="size-3.5" aria-hidden="true" />
                          {hasSummary ? "ערוך סיכום" : "צור סיכום"}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
