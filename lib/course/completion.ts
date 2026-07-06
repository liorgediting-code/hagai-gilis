export type ExerciseMeta = { id: string; lesson_id: string; level: number };

/**
 * Single source of truth for "is this lesson complete for this student".
 * A lesson is complete when its terminal exercise — the one at the highest
 * level present in the lesson — has a passed submission. This unifies every
 * completion path: chart/quiz Level-3 pass, an approved (or auto-completed)
 * file upload, and admin approval all produce a passed submission.
 * A lesson with no exercises is complete once the video is marked watched.
 */
export function isLessonComplete(
  lessonId: string,
  exercises: ExerciseMeta[],
  passedExerciseIds: Set<string>,
  completedAt: string | null,
): boolean {
  const own = exercises.filter((e) => e.lesson_id === lessonId);
  if (own.length === 0) return completedAt != null;
  const maxLevel = Math.max(...own.map((e) => e.level));
  return own.some((e) => e.level === maxLevel && passedExerciseIds.has(e.id));
}
