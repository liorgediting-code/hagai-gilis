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
