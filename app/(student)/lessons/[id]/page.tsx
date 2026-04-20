import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, ChevronLeftIcon, FileTextIcon, DumbbellIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { VideoPlayer } from "@/components/lesson/video-player";
import { MarkCompleteButton } from "@/app/(student)/_components/mark-complete-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, LessonSummaryRow, ExerciseRow } from "@/lib/types/course-types";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

type SiblingLesson = Pick<LessonRow, "id" | "title" | "order_index">;

export default async function LessonPage({ params }: LessonPageProps) {
  await requirePageAccess("lessons");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null; error: unknown };

  if (!lesson) notFound();

  const [
    { data: progress },
    { data: summary },
    { data: siblings },
    { data: firstExercise },
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
      .from("lessons")
      .select("id, title, order_index")
      .eq("module_id", lesson.module_id)
      .order("order_index", { ascending: true }) as unknown) as Promise<{ data: SiblingLesson[] | null; error: unknown }>,
    (db
      .from("exercises")
      .select("id")
      .eq("lesson_id", id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle() as unknown) as Promise<{ data: Pick<ExerciseRow, "id"> | null; error: unknown }>,
  ]);

  const isCompleted = progress?.completed_at != null;

  const currentIndex = siblings?.findIndex((s) => s.id === id) ?? -1;
  const prevLesson = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const nextLesson =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

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

        {firstExercise && (
          <Link
            href={`/exercises/${firstExercise.id}`}
            className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
          >
            <DumbbellIcon className="size-4" aria-hidden="true" />
            תרגול שיעור
          </Link>
        )}
      </div>

      {/* Navigation row */}
      {(prevLesson || nextLesson) && (
        <div className="flex items-center justify-between gap-3">
          {/* Start (right in RTL) — previous lesson */}
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.id}`}
              className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
              שיעור קודם
            </Link>
          ) : (
            <div />
          )}

          {/* End (left in RTL) — next lesson */}
          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.id}`}
              className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
            >
              שיעור הבא
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
