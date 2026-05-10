import Link from "next/link";
import { BookOpenIcon, CheckCircleIcon, LockIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  LessonRow,
  LessonProgressRow,
  ModuleRow,
  LessonUnlockRow,
} from "@/lib/types/course-types";

type PassedL3Row = { exercises: { lesson_id: string } };

export default async function LessonsPage() {
  await requirePageAccess("lessons");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: modulesData },
    { data: lessonsData },
    { data: progressData },
    { data: unlocksData },
    { data: passedL3Data },
  ] = await Promise.all([
    db.from("modules").select("*").order("order_index") as unknown as Promise<{
      data: ModuleRow[] | null;
    }>,
    db
      .from("lessons")
      .select("*")
      .order("module_id")
      .order("order_index") as unknown as Promise<{ data: LessonRow[] | null }>,
    db
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", user.id) as unknown as Promise<{
      data: Pick<LessonProgressRow, "lesson_id" | "completed_at">[] | null;
    }>,
    db
      .from("lesson_unlocks")
      .select("lesson_id")
      .eq("user_id", user.id) as unknown as Promise<{
      data: Pick<LessonUnlockRow, "lesson_id">[] | null;
    }>,
    db
      .from("exercise_submissions")
      .select("exercises!inner(lesson_id)")
      .eq("user_id", user.id)
      .eq("passed", true)
      .eq("exercises.level", 3) as unknown as Promise<{
      data: PassedL3Row[] | null;
    }>,
  ]);

  const allModules = modulesData ?? [];
  const allLessons = lessonsData ?? [];

  const completedSet = new Set(
    (progressData ?? [])
      .filter((p) => p.completed_at !== null)
      .map((p) => p.lesson_id),
  );
  const manualUnlockSet = new Set((unlocksData ?? []).map((u) => u.lesson_id));
  const passedL3LessonSet = new Set(
    (passedL3Data ?? []).map((s) => s.exercises.lesson_id),
  );

  // Group lessons by module, preserving sorted order
  const lessonsByModule = new Map<string, LessonRow[]>();
  for (const lesson of allLessons) {
    const group = lessonsByModule.get(lesson.module_id) ?? [];
    group.push(lesson);
    lessonsByModule.set(lesson.module_id, group);
  }

  // Determine which module is globally first (lowest order_index)
  const firstModuleId = allModules[0]?.id;

  function isLessonUnlocked(
    lesson: LessonRow,
    prevLesson: LessonRow | undefined,
  ): boolean {
    // First lesson of the first module is always open
    if (lesson.module_id === firstModuleId && lesson.order_index === 0) {
      return true;
    }
    // First lesson of any other module: unlocked if order_index === 0 (spec simplification)
    if (lesson.order_index === 0) return true;
    // Manual admin unlock
    if (manualUnlockSet.has(lesson.id)) return true;
    // Previous lesson (by sorted position) has a passed L3 submission
    if (prevLesson && passedL3LessonSet.has(prevLesson.id)) return true;
    return false;
  }

  const hasAnyLesson = allLessons.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpenIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">שיעורים</h1>
      </div>

      {!hasAnyLesson ? (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      ) : (
        <div className="space-y-8">
          {allModules.map((module) => {
            const moduleLessons = lessonsByModule.get(module.id) ?? [];
            if (moduleLessons.length === 0) return null;

            const completedInModule = moduleLessons.filter((l) =>
              completedSet.has(l.id),
            ).length;

            return (
              <section key={module.id} aria-labelledby={`module-${module.id}`}>
                <div className="mb-3">
                  <h2
                    id={`module-${module.id}`}
                    className="font-heading text-lg font-bold text-foreground"
                  >
                    {module.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {completedInModule} מתוך {moduleLessons.length} שיעורים הושלמו
                  </p>
                </div>

                <Card>
                  <CardHeader className="border-b border-border/50 pb-3 pt-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      שיעורים בנושא
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border/30">
                      {moduleLessons.map((lesson, idx) => {
                        const prevLesson =
                          idx > 0 ? moduleLessons[idx - 1] : undefined;
                        const unlocked = isLessonUnlocked(lesson, prevLesson);
                        const completed = completedSet.has(lesson.id);

                        if (!unlocked) {
                          return (
                            <li key={lesson.id}>
                              <div className="flex min-h-14 cursor-not-allowed items-center gap-3 px-4 py-3 opacity-50">
                                <span
                                  className="flex size-6 shrink-0 items-center justify-center"
                                  aria-label="נעול"
                                >
                                  <LockIcon
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                </span>
                                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                  <span className="shrink-0 text-xs font-bold text-muted-foreground/60">
                                    {idx + 1}
                                  </span>
                                  <p className="truncate text-sm font-medium text-muted-foreground">
                                    {lesson.title}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                  נעול
                                </span>
                              </div>
                            </li>
                          );
                        }

                        return (
                          <li key={lesson.id}>
                            <Link
                              href={`/lessons/${lesson.id}`}
                              className={`flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                                !completed && unlocked
                                  ? "border-s-2 border-primary bg-primary/5"
                                  : ""
                              }`}
                            >
                              <span
                                className="flex size-6 shrink-0 items-center justify-center"
                                aria-label={completed ? "הושלם" : "פתוח"}
                              >
                                {completed ? (
                                  <CheckCircleIcon
                                    className="size-5 text-primary"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <PlayCircleIcon
                                    className="size-5 text-primary"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>

                              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                <span className="shrink-0 text-xs font-bold text-muted-foreground/60">
                                  {idx + 1}
                                </span>
                                <p
                                  className={`truncate text-sm font-medium ${
                                    completed
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {lesson.title}
                                </p>
                              </div>

                              {completed && (
                                <span className="shrink-0 text-xs font-medium text-primary">
                                  הושלם
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
