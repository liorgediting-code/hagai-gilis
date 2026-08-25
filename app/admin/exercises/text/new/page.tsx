import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { TextExerciseForm } from "../_components/text-exercise-form";
import { createTextExerciseAction } from "../actions";
import type { LessonRow } from "@/lib/types/course-types";

interface Props { searchParams: Promise<{ lesson_id?: string }> }

export default async function NewTextExercisePage({ searchParams }: Props) {
  await requireAdmin();
  const { lesson_id } = await searchParams;
  const db = asUntyped(await createClient());
  const { data: lessons } = (await db.from("lessons").select("id, title").order("title")) as {
    data: Pick<LessonRow, "id" | "title">[] | null;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">תרגיל כתיבה חדש</h1>
      <TextExerciseForm action={createTextExerciseAction} lessons={lessons ?? []} defaultLessonId={lesson_id} />
    </div>
  );
}
