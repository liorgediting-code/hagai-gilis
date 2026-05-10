"use client";

import type {
  SanitizedChartClickExercise,
  SanitizedMultipleChoiceExercise,
} from "@/lib/types/exercise-types";

export interface ExerciseFlowProps {
  exercise: {
    id: string;
    title: string;
    level: number;
    content: SanitizedChartClickExercise | SanitizedMultipleChoiceExercise;
  };
  lessonId: string;
  level: 1 | 2 | 3;
  passThreshold: number;
}

// Placeholder — real implementation in Task 12
export function ExerciseFlow({ exercise, lessonId, level, passThreshold }: ExerciseFlowProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
      <p className="text-sm">טוען תרגיל... (ייושם במשימה 12)</p>
      <p className="mt-2 text-xs opacity-60">
        {exercise.title} | שיעור: {lessonId} | רמה: {level} | סף מעבר: {passThreshold}%
      </p>
    </div>
  );
}
