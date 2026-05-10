import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitExerciseButton } from "./_components/submit-exercise-button";
import { ChartExercise } from "./_components/chart-exercise";
import { MultipleChoiceExercise } from "./_components/multiple-choice-exercise";
import { LegacyCandleSelectExercise } from "./_components/legacy-candle-select-exercise";
import type {
  ExerciseContent,
  SanitizedChartClickExercise,
  SanitizedMultipleChoiceExercise,
} from "@/lib/types/exercise-types";
import type { ExerciseRow, LessonRow, LessonProgressRow, ExerciseSubmissionRow, CandleChartExercise } from "@/lib/types/course-types";

function isCandleChart(v: unknown): v is CandleChartExercise {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as Record<string, unknown>).type === "candle_chart_select"
  );
}

function sanitize(content: ExerciseContent): SanitizedChartClickExercise | SanitizedMultipleChoiceExercise | null {
  if (content.type === "chart_click") {
    const { acceptance_zone: _z, ...safe } = content;
    return safe;
  }
  if (content.type === "multiple_choice") {
    const sanitizedQuestions = content.questions.map(({ correct_option_index: _c, explanation: _e, ...q }) => q);
    return { ...content, questions: sanitizedQuestions };
  }
  return null;
}

interface ExercisePageProps {
  params: Promise<{ id: string }>;
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  await requirePageAccess("exercises");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: exercise } = (await db
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single()) as { data: ExerciseRow | null; error: unknown };

  if (!exercise) notFound();

  const { data: lesson } = (await db
    .from("lessons")
    .select("id, title")
    .eq("id", exercise.lesson_id)
    .single()) as { data: Pick<LessonRow, "id" | "title"> | null; error: unknown };

  const { data: progress } = (await db
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", exercise.lesson_id)
    .maybeSingle()) as { data: Pick<LessonProgressRow, "completed_at"> | null; error: unknown };

  if (!progress?.completed_at) notFound();

  const { data: submissions } = (await db
    .from("exercise_submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("exercise_id", id)
    .limit(1)) as { data: Pick<ExerciseSubmissionRow, "id">[] | null; error: unknown };

  const hasSubmitted = (submissions ?? []).length > 0;
  const rawContent = exercise.content_json;
  const content = rawContent as ExerciseContent | null;

  return (
    <div className="space-y-6">
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/exercises" className="transition-colors hover:text-foreground">
          תרגולי שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{exercise.title}</span>
      </nav>

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{exercise.title}</h1>
        {lesson && (
          <p className="mt-1 text-sm text-muted-foreground">
            שיעור: {lesson.title}
          </p>
        )}
      </div>

      {exercise.description && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm text-foreground leading-relaxed">{exercise.description}</p>
          </CardContent>
        </Card>
      )}

      {content?.type === "chart_click" && (
        <ChartExercise
          exerciseId={id}
          chartData={sanitize(content) as SanitizedChartClickExercise}
          hasSubmitted={hasSubmitted}
        />
      )}

      {content?.type === "multiple_choice" && (
        <MultipleChoiceExercise
          exerciseId={id}
          chartData={sanitize(content) as SanitizedMultipleChoiceExercise}
          hasSubmitted={hasSubmitted}
        />
      )}

      {isCandleChart(rawContent) && (
        <LegacyCandleSelectExercise
          exerciseId={id}
          chartData={rawContent}
          hasSubmitted={hasSubmitted}
        />
      )}

      {content !== null && content?.type !== "chart_click" && content?.type !== "multiple_choice" && !isCandleChart(rawContent) && (
        <>
          <Card>
            <CardContent className="flex min-h-64 items-center justify-center pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">סוג תרגיל זה אינו נתמך עדיין</p>
              </div>
            </CardContent>
          </Card>
          <SubmitExerciseButton exerciseId={id} hasSubmitted={hasSubmitted} />
        </>
      )}
    </div>
  );
}
