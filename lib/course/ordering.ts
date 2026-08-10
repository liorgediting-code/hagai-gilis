import type { LessonRow, UnitRow } from "@/lib/types/course-types";

/**
 * order_index ties are common in the current data (admin never reordered),
 * so every sequencing comparison needs a deterministic tiebreak. created_at
 * (insertion order) keeps the sequence stable instead of falling back to
 * whatever incidental order the DB returns for equal order_index values.
 */
export function compareOrder(
  a: { id: string; order_index: number; created_at: string },
  b: { id: string; order_index: number; created_at: string },
): number {
  return (
    a.order_index - b.order_index ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Flatten a module's lessons into a single linear sequence: units in the
 * order given by the caller (already sorted), each unit's own lessons in
 * order. Progression (unlock / prev-next) runs over this linear list.
 */
export function flattenModuleLessons(
  units: Pick<UnitRow, "id" | "order_index" | "created_at">[],
  lessons: LessonRow[],
): LessonRow[] {
  const sortedUnits = [...units].sort(compareOrder);
  const result: LessonRow[] = [];
  for (const unit of sortedUnits) {
    const unitLessons = lessons.filter((l) => l.unit_id === unit.id).sort(compareOrder);
    result.push(...unitLessons);
  }
  return result;
}

/** Next lesson after `currentId` within an already-flattened linear sequence. */
export function nextLessonInSequence(ordered: LessonRow[], currentId: string): LessonRow | null {
  const idx = ordered.findIndex((l) => l.id === currentId);
  return idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
}

/**
 * Single source of truth for "is this lesson unlocked for this student".
 * Mirrors the rule shown in the /lessons list — used there and re-checked
 * server-side on the lesson detail / exercise pages so a direct link can't
 * bypass the sequence.
 */
export function isLessonUnlocked(
  lessonId: string,
  prevLessonId: string | null,
  manualUnlockSet: ReadonlySet<string>,
  completedSet: ReadonlySet<string>,
): boolean {
  // First lesson of any module (no previous lesson in the flattened sequence) is always open
  if (!prevLessonId) return true;
  // Manual admin unlock (override)
  if (manualUnlockSet.has(lessonId)) return true;
  // Previous lesson is complete by any path (exercise passed / approved / watched)
  if (completedSet.has(prevLessonId)) return true;
  return false;
}
