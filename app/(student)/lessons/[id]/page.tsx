import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, FileTextIcon, DumbbellIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { flattenModuleLessons, nextLessonInSequence } from "@/lib/course/ordering";
import { isLessonComplete, type ExerciseMeta } from "@/lib/course/completion";
import { VideoPlayer } from "@/components/lesson/video-player";
import { MarkCompleteButton } from "@/app/(student)/_components/mark-complete-button";
import { FileUploadExercise as FileUploadExerciseClient } from "./exercise/_components/file-upload-exercise";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, LessonSummaryRow } from "@/lib/types/course-types";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface LessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retry?: string }>;
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  await requirePageAccess("lessons");
  const { id } = await params;
  const { retry } = await searchParams;
  const showRetryBanner = retry === "true";
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null; error: unknown };

  if (!lesson) notFound();

  const { data: unitRow } = (await db
    .from("units")
    .select("id, module_id, order_index")
    .eq("id", lesson.unit_id)
    .single()) as { data: { id: string; module_id: string; order_index: number } | null };

  const [
    { data: progress },
    { data: summary },
    { data: lessonExercises },
  ] = await Promise.all([
    (db
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", id)
      .maybeSingle() as unknown) as Promise<{ data: LessonProgressRow | null; error: unknown }>,
    (db
      .from("lesson_summaries")
      .select("lesson_id")
      .eq("lesson_id", id)
      .maybeSingle() as unknown) as Promise<{ data: Pick<LessonSummaryRow, "lesson_id"> | null; error: unknown }>,
    (db
      .from("exercises")
      .select("id, lesson_id, level, order_index, content_json")
      .eq("lesson_id", id)
      .order("order_index", { ascending: true }) as unknown) as Promise<{
      data: { id: string; lesson_id: string; level: number; order_index: number; content_json: { type?: string } | null }[] | null;
    }>,
  ]);

  const { data: moduleUnits } = (await db
    .from("units")
    .select("id, order_index")
    .eq("module_id", unitRow?.module_id ?? "")
    .order("order_index")) as { data: { id: string; order_index: number }[] | null };

  const unitIds = (moduleUnits ?? []).map((u) => u.id);
  const { data: moduleLessons } = (await db
    .from("lessons")
    .select("*")
    .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])) as {
    data: LessonRow[] | null;
  };

  const orderedSiblings = flattenModuleLessons(moduleUnits ?? [], moduleLessons ?? []);

  // "Watched" — reveals the exercise/upload section within the lesson.
  const isCompleted = progress?.completed_at != null;

  const currentIndex = orderedSiblings.findIndex((s) => s.id === id);
  const prevLesson = currentIndex > 0 ? orderedSiblings[currentIndex - 1] : null;
  const nextLesson = nextLessonInSequence(orderedSiblings, id);

  const exercises = lessonExercises ?? [];
  const fileExercises = exercises.filter((e) => e.content_json?.type === "file_upload");
  const hasChartExercise = exercises.some(
    (e) => e.content_json?.type === "chart_click" || e.content_json?.type === "multiple_choice",
  );

  const allExerciseIds = exercises.map((e) => e.id);
  const { data: subs } = (await db
    .from("exercise_submissions")
    .select("exercise_id, passed")
    .eq("user_id", user.id)
    .in("exercise_id", allExerciseIds.length > 0 ? allExerciseIds : ["00000000-0000-0000-0000-000000000000"])) as {
    data: { exercise_id: string; passed: boolean | null }[] | null;
  };

  const fileSubMap = new Map((subs ?? []).map((s) => [s.exercise_id, s]));
  const passedExerciseIds = new Set((subs ?? []).filter((s) => s.passed === true).map((s) => s.exercise_id));

  // Unified completion — the gate that opens the next lesson.
  const exercisesMeta: ExerciseMeta[] = exercises.map((e) => ({ id: e.id, lesson_id: e.lesson_id, level: e.level }));
  const lessonComplete = isLessonComplete(id, exercisesMeta, passedExerciseIds, progress?.completed_at ?? null);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/lessons" className="transition-colors hover:text-foreground">
          שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{lesson.title}</span>
      </nav>

      <h1 className="font-heading text-2xl font-bold text-foreground">{lesson.title}</h1>

      {/* Retry banner */}
      {showRetryBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-amber-800">
            חזור לצפות בשיעור ואז לחץ על המשך לתרגול
          </p>
          <Link
            href={`/lessons/${id}/exercise`}
            className={buttonVariants({ className: "min-h-11 shrink-0 gap-2 bg-amber-500 text-white hover:bg-amber-600" })}
          >
            <DumbbellIcon className="size-4" aria-hidden="true" />
            המשך לתרגול רמה 2
          </Link>
        </div>
      )}

      {/* Video */}
      <VideoPlayer videoUrl={lesson.video_url} />

      {/* Description */}
      {lesson.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <MarkCompleteButton lessonId={id} isCompleted={isCompleted} />

        {summary && (
          <Link
            href={`/summaries/${id}`}
            className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
          >
            <FileTextIcon className="size-4" aria-hidden="true" />
            סיכום שיעור
          </Link>
        )}
      </div>

      {/* Exercises section — unlocks after video marked complete */}
      {hasChartExercise && (
        <Card className={isCompleted ? "border-primary/30 bg-primary/5" : "opacity-60"}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <DumbbellIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">תרגול לנושא זה</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isCompleted
                      ? "השלם את התרגול כדי לפתוח את השיעור הבא"
                      : "סמן את הצפייה בשיעור כהושלמה כדי לפתוח את התרגול"}
                  </p>
                </div>
              </div>
              {isCompleted ? (
                <Link
                  href={`/lessons/${id}/exercise`}
                  className={buttonVariants({ className: "min-h-11 shrink-0 gap-2" })}
                >
                  <DumbbellIcon className="size-4" aria-hidden="true" />
                  התחל תרגול
                </Link>
              ) : (
                <div className="shrink-0 rounded-lg border border-dashed border-muted-foreground/40 px-4 py-2 text-xs text-muted-foreground">
                  נעול
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File-upload submission tasks — available once video marked complete */}
      {fileExercises.length > 0 && isCompleted && fileExercises.map((ex) => {
        const content = ex.content_json as FileUploadExercise;
        const existing = fileSubMap.get(ex.id);
        return (
          <Card key={ex.id}>
            <CardContent className="pt-5 pb-5 space-y-3">
              <p className="font-semibold text-sm">משימת הגשה</p>
              <FileUploadExerciseClient
                exerciseId={ex.id}
                lessonId={id}
                content={content}
                existing={existing ? { count: 1, passed: existing.passed } : null}
                nextLessonId={nextLesson?.id ?? null}
              />
            </CardContent>
          </Card>
        );
      })}
      {fileExercises.length > 0 && !isCompleted && (
        <Card className="opacity-60">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground">סמן את הצפייה בשיעור כהושלמה כדי לפתוח את משימת ההגשה</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation row — previous always; next appears once the lesson is complete */}
      {(prevLesson || lessonComplete) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.id}`}
              className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
            >
              <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
              שיעור קודם
            </Link>
          ) : (
            <span />
          )}

          {lessonComplete && (
            <Link
              href={nextLesson ? `/lessons/${nextLesson.id}` : "/lessons"}
              className={buttonVariants({ className: "min-h-11" })}
            >
              {nextLesson ? "המשך לשיעור הבא" : "לכל השיעורים"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
