import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { TextExerciseForm } from "../../_components/text-exercise-form";
import { updateTextExerciseAction } from "../../actions";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";
import type { TextAnswerExercise } from "@/lib/types/exercise-types";

interface Props { params: Promise<{ id: string }> }

export default async function EditTextExercisePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: exercise }, { data: lessons }] = (await Promise.all([
    db.from("exercises").select("*").eq("id", id).single(),
    db.from("lessons").select("id, title").order("title"),
  ])) as [{ data: ExerciseRow | null }, { data: Pick<LessonRow, "id" | "title">[] | null }];

  if (!exercise) notFound();
  const content = exercise.content_json as TextAnswerExercise | null;
  if (!content || content.type !== "text_answer") notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">עריכת תרגיל כתיבה</h1>
      <TextExerciseForm
        action={updateTextExerciseAction}
        lessons={lessons ?? []}
        exerciseId={exercise.id}
        defaultLessonId={exercise.lesson_id}
        defaultTitle={exercise.title}
        defaultOrderIndex={exercise.order_index}
        defaultContent={content}
      />
    </div>
  );
}
