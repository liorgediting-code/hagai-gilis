import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { ExerciseWizard } from "../../_components/exercise-wizard";
import type { LessonRow, ExerciseRow } from "@/lib/types/course-types";
import type { ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExercisePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: exercise }, { data: lessons }] = await Promise.all([
    db.from("exercises").select("*").eq("id", id).single() as unknown as Promise<{ data: ExerciseRow | null }>,
    db.from("lessons").select("id, title").order("order_index") as unknown as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null }>,
  ]);

  if (!exercise) notFound();

  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise | null;

  const csvRaw = content?.candles
    .map((c) => `${c.date},${c.open},${c.high},${c.low},${c.close}`)
    .join("\n") ?? "";

  const initial = content?.type === "chart_click" ? {
    editId: id,
    type: "chart_click" as const,
    csvRaw,
    candles: content.candles,
    supportLevels: content.support_levels,
    resistanceLevels: content.resistance_levels,
    acceptanceZone: content.acceptance_zone,
    title: exercise.title,
    question: content.question,
    explanation: content.explanation,
    lessonId: exercise.lesson_id,
    orderIndex: exercise.order_index,
  } : content?.type === "multiple_choice" ? {
    editId: id,
    type: "multiple_choice" as const,
    csvRaw,
    candles: content.candles,
    supportLevels: content.support_levels,
    resistanceLevels: content.resistance_levels,
    options: content.questions[0]?.options,
    correctOptionIndex: content.questions[0]?.correct_option_index,
    title: exercise.title,
    question: content.questions[0]?.question,
    explanation: content.questions[0]?.explanation,
    lessonId: exercise.lesson_id,
    orderIndex: exercise.order_index,
  } : { editId: id };

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/exercises" className="hover:text-foreground transition-colors">תרגילים</Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" />
        <span className="font-medium text-foreground">{exercise.title}</span>
      </nav>
      <h1 className="font-heading text-2xl font-bold">עריכת תרגיל</h1>
      <ExerciseWizard lessons={lessons ?? []} initial={initial} />
    </div>
  );
}
