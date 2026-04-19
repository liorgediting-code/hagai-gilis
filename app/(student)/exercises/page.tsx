import Link from "next/link";
import { DumbbellIcon, ChevronDownIcon, LockIcon, CheckCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

export default async function ExercisesPage() {
  await requirePageAccess("exercises");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: lessons },
    { data: exercises },
    { data: progress },
    { data: submissions },
  ] = await Promise.all([
    db.from("lessons").select("*").order("order_index") as unknown as Promise<{ data: LessonRow[] | null; error: unknown }>,
    db.from("exercises").select("*").order("order_index") as unknown as Promise<{ data: ExerciseRow[] | null; error: unknown }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as unknown as Promise<{ data: LessonProgressRow[] | null; error: unknown }>,
    db.from("exercise_submissions").select("exercise_id").eq("user_id", user.id) as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "exercise_id">[] | null; error: unknown }>,
  ]);

  const allLessons = lessons ?? [];
  const allExercises = exercises ?? [];

  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );
  const submittedExerciseIds = new Set((submissions ?? []).map((s) => s.exercise_id));

  const exercisesByLesson = new Map<string, ExerciseRow[]>();
  for (const ex of allExercises) {
    if (!exercisesByLesson.has(ex.lesson_id)) exercisesByLesson.set(ex.lesson_id, []);
    exercisesByLesson.get(ex.lesson_id)!.push(ex);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">תרגולי שיעורים</h1>
      </div>

      {allLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      ) : (
        <div className="space-y-3">
          {allLessons.map((lesson, idx) => {
            const lessonExercises = exercisesByLesson.get(lesson.id) ?? [];
            const isUnlocked = completedLessonIds.has(lesson.id);
            const doneCount = lessonExercises.filter((ex) => submittedExerciseIds.has(ex.id)).length;

            return (
              <Card key={lesson.id} className={isUnlocked ? "" : "opacity-50"}>
                <CardHeader className="border-b border-border/50 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-bold text-primary-foreground">
                      {idx + 1}
                    </span>
                    <CardTitle className="flex-1 text-sm font-semibold text-foreground">
                      {lesson.title}
                    </CardTitle>
                    {isUnlocked ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {doneCount}/{lessonExercises.length} הושלמו
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                        <LockIcon className="size-3" aria-hidden="true" />
                        נעול
                      </span>
                    )}
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                </CardHeader>

                {isUnlocked && lessonExercises.length > 0 && (
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border/30">
                      {lessonExercises.map((ex) => {
                        const done = submittedExerciseIds.has(ex.id);
                        return (
                          <li key={ex.id}>
                            <Link
                              href={`/exercises/${ex.id}`}
                              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                            >
                              <span
                                className="flex size-6 shrink-0 items-center justify-center"
                                aria-label={done ? "הושלם" : "פתוח"}
                              >
                                {done ? (
                                  <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
                                ) : (
                                  <span className="block size-5 rounded-full border-2 border-muted-foreground/30" />
                                )}
                              </span>
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium text-foreground">{ex.title}</p>
                                {ex.description && (
                                  <p className="truncate text-xs text-muted-foreground">{ex.description}</p>
                                )}
                              </div>
                              {done && (
                                <span className="shrink-0 text-xs font-medium text-primary">הושלם</span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                )}

                {!isUnlocked && (
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground">
                      צפה בשיעור וסמן &quot;סמן כהושלם&quot; כדי לפתוח את התרגולים.
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
