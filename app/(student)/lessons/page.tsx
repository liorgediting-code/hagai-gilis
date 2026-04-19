import Link from "next/link";
import { BookOpenIcon, CheckCircleIcon, CircleIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow } from "@/lib/types/course-types";

export default async function LessonsPage() {
  await requirePageAccess("lessons");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    db.from("lessons").select("*").order("order_index") as unknown as Promise<{
      data: LessonRow[] | null;
      error: unknown;
    }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as unknown as Promise<{
      data: LessonProgressRow[] | null;
      error: unknown;
    }>,
  ]);

  const allLessons = lessons ?? [];
  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );

  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const nextLesson = allLessons.find((l) => !completedIds.has(l.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpenIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">שיעורים</h1>
      </div>

      {allLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {completedCount} מתוך {allLessons.length} שיעורים הושלמו
          </p>

          <Card>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                כל השיעורים
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/30">
                {allLessons.map((lesson, idx) => {
                  const done = completedIds.has(lesson.id);
                  const isCurrent = nextLesson?.id === lesson.id;

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={`flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                          isCurrent ? "border-s-2 border-primary bg-primary/5" : ""
                        }`}
                      >
                        {/* Status icon */}
                        <span
                          className="flex size-6 shrink-0 items-center justify-center"
                          aria-label={done ? "הושלם" : isCurrent ? "בתהליך" : "לא הושלם"}
                        >
                          {done ? (
                            <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
                          ) : isCurrent ? (
                            <PlayCircleIcon className="size-5 text-primary" aria-hidden="true" />
                          ) : (
                            <CircleIcon className="size-5 text-muted-foreground/30" aria-hidden="true" />
                          )}
                        </span>

                        {/* Order badge + title */}
                        <div className="flex flex-1 items-center gap-2 overflow-hidden">
                          <span className="shrink-0 text-xs font-bold text-muted-foreground/60">
                            {idx + 1}
                          </span>
                          <p
                            className={`truncate text-sm font-medium ${
                              done ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {lesson.title}
                          </p>
                        </div>

                        {/* Done label */}
                        {done && (
                          <span className="shrink-0 text-xs font-medium text-primary">הושלם</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
