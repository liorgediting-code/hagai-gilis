import { asUntyped, type UntypedClient } from "@/lib/supabase/untyped";
import { isLessonComplete, type ExerciseMeta } from "@/lib/course/completion";
import { isLessonUnlocked } from "@/lib/course/ordering";

/**
 * Server-side re-check of the same unlock rule the /lessons list uses to hide
 * links — closes the gap where a direct URL to a locked lesson would
 * otherwise bypass the sequence entirely.
 */
export async function checkLessonUnlocked(
  client: unknown,
  userId: string,
  lessonId: string,
  prevLesson: { id: string } | null,
): Promise<boolean> {
  if (!prevLesson) return true;

  const db: UntypedClient = asUntyped(client);

  const [{ data: manualUnlock }, { data: prevExercises }, { data: prevProgress }] = await Promise.all([
    db
      .from("lesson_unlocks")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle() as unknown as Promise<{ data: { lesson_id: string } | null }>,
    db
      .from("exercises")
      .select("id, lesson_id, level")
      .eq("lesson_id", prevLesson.id) as unknown as Promise<{ data: ExerciseMeta[] | null }>,
    db
      .from("lesson_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("lesson_id", prevLesson.id)
      .maybeSingle() as unknown as Promise<{ data: { completed_at: string | null } | null }>,
  ]);

  const exercises = prevExercises ?? [];
  let passedIds = new Set<string>();
  if (exercises.length > 0) {
    const exerciseIds = exercises.map((e) => e.id);
    const { data: prevSubs } = (await db
      .from("exercise_submissions")
      .select("exercise_id")
      .eq("user_id", userId)
      .eq("passed", true)
      .in("exercise_id", exerciseIds)) as { data: { exercise_id: string }[] | null };
    passedIds = new Set((prevSubs ?? []).map((s) => s.exercise_id));
  }

  const prevCompleted = isLessonComplete(prevLesson.id, exercises, passedIds, prevProgress?.completed_at ?? null);

  return isLessonUnlocked(
    lessonId,
    prevLesson.id,
    manualUnlock ? new Set([lessonId]) : new Set(),
    prevCompleted ? new Set([prevLesson.id]) : new Set(),
  );
}
