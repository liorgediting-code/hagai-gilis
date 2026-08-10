import type { LessonRow, UnitRow } from "@/lib/types/course-types";

/**
 * Flatten a module's lessons into a single linear sequence:
 * ordered by the unit's order_index, then the lesson's order_index.
 * Progression (unlock / prev-next) runs over this linear list.
 */
export function flattenModuleLessons(
  units: Pick<UnitRow, "id" | "order_index">[],
  lessons: LessonRow[],
): LessonRow[] {
  const unitOrder = new Map(units.map((u) => [u.id, u.order_index]));
  const inModule = lessons.filter((l) => unitOrder.has(l.unit_id));
  return inModule.sort((a, b) => {
    const ua = unitOrder.get(a.unit_id) ?? 0;
    const ub = unitOrder.get(b.unit_id) ?? 0;
    if (ua !== ub) return ua - ub;
    return a.order_index - b.order_index;
  });
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
