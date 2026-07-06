import Link from "next/link";
import { BookOpenIcon, CheckCircleIcon, LockIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { flattenModuleLessons } from "@/lib/course/ordering";
import { isLessonComplete, type ExerciseMeta } from "@/lib/course/completion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  LessonRow,
  LessonProgressRow,
  ModuleRow,
  LessonUnlockRow,
  UnitRow,
} from "@/lib/types/course-types";

export default async function LessonsPage() {
  await requirePageAccess("lessons");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: modulesData },
    { data: unitsData },
    { data: lessonsData },
    { data: progressData },
    { data: unlocksData },
    { data: exercisesData },
    { data: passedSubsData },
  ] = await Promise.all([
    db.from("modules").select("*").order("order_index") as unknown as Promise<{
      data: ModuleRow[] | null;
    }>,
    db.from("units").select("*").order("module_id").order("order_index") as unknown as Promise<{
      data: UnitRow[] | null;
    }>,
    db
      .from("lessons")
      .select("*")
      .order("unit_id")
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
      .from("exercises")
      .select("id, lesson_id, level") as unknown as Promise<{ data: ExerciseMeta[] | null }>,
    db
      .from("exercise_submissions")
      .select("exercise_id")
      .eq("user_id", user.id)
      .eq("passed", true) as unknown as Promise<{ data: { exercise_id: string }[] | null }>,
  ]);

  const allModules = modulesData ?? [];
  const allLessons = lessonsData ?? [];

  const allExercises = exercisesData ?? [];
  const passedExerciseIds = new Set((passedSubsData ?? []).map((s) => s.exercise_id));
  const completedAtMap = new Map(
    (progressData ?? []).map((p) => [p.lesson_id, p.completed_at]),
  );

  // Unified completion: terminal exercise passed, or (no exercise) video marked watched.
  const completedSet = new Set(
    allLessons
      .filter((l) =>
        isLessonComplete(l.id, allExercises, passedExerciseIds, completedAtMap.get(l.id) ?? null),
      )
      .map((l) => l.id),
  );
  const manualUnlockSet = new Set((unlocksData ?? []).map((u) => u.lesson_id));

  // Group units by module, and lessons by unit, preserving sorted order
  const allUnits = unitsData ?? [];
  const unitsByModule = new Map<string, UnitRow[]>();
  for (const u of allUnits) {
    const g = unitsByModule.get(u.module_id) ?? [];
    g.push(u);
    unitsByModule.set(u.module_id, g);
  }
  const lessonsByUnit = new Map<string, LessonRow[]>();
  for (const l of allLessons) {
    const g = lessonsByUnit.get(l.unit_id) ?? [];
    g.push(l);
    lessonsByUnit.set(l.unit_id, g);
  }

  // Previous lesson in each module's flattened (unit-then-lesson) linear sequence
  const prevLessonInModule = new Map<string, LessonRow | undefined>();
  for (const mod of allModules) {
    const mUnits = (unitsByModule.get(mod.id) ?? []).sort((a, b) => a.order_index - b.order_index);
    const flat = flattenModuleLessons(mUnits, allLessons);
    flat.forEach((l, i) => prevLessonInModule.set(l.id, i > 0 ? flat[i - 1] : undefined));
  }

  function isLessonUnlocked(
    lesson: LessonRow,
    prevLesson: LessonRow | undefined,
  ): boolean {
    // First lesson of any module (no previous lesson in the flattened sequence) is always open
    if (!prevLesson) return true;
    // Manual admin unlock (override)
    if (manualUnlockSet.has(lesson.id)) return true;
    // Previous lesson is complete by any path (exercise passed / approved / watched)
    if (completedSet.has(prevLesson.id)) return true;
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
            const mUnits = (unitsByModule.get(module.id) ?? []).sort((a, b) => a.order_index - b.order_index);
            const moduleLessonCount = mUnits.reduce((n, u) => n + (lessonsByUnit.get(u.id)?.length ?? 0), 0);
            if (moduleLessonCount === 0) return null;

            const completedInModule = mUnits.reduce(
              (n, u) => n + (lessonsByUnit.get(u.id) ?? []).filter((l) => completedSet.has(l.id)).length,
              0,
            );

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
                    {completedInModule} מתוך {moduleLessonCount} שיעורים הושלמו
                  </p>
                </div>

                <div className="space-y-4">
                  {mUnits.map((unit) => {
                    const unitLessons = (lessonsByUnit.get(unit.id) ?? []).sort((a, b) => a.order_index - b.order_index);
                    if (unitLessons.length === 0) return null;
                    return (
                      <Card key={unit.id}>
                        <CardHeader className="border-b border-border/50 pb-3 pt-3">
                          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {unit.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <ul className="divide-y divide-border/30">
                            {unitLessons.map((lesson, idx) => {
                              const prevLesson = prevLessonInModule.get(lesson.id);
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
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
