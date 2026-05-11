"use client";

import { useState } from "react";
import Link from "next/link";
import { submitExerciseAttempt } from "../actions";
import { ChartClickExercise } from "./chart-click-exercise";
import { QuizExercise } from "./quiz-exercise";
import type {
  SanitizedExerciseContent,
  ChartClickAnswer,
  MultipleChoiceAnswer,
  ExerciseSubmitResult,
} from "@/lib/types/exercise-types";

export interface ExerciseFlowProps {
  exercise: SanitizedExerciseContent;
  exerciseId: string;
  lessonId: string;
  /** Forwarded to ResultCard in Task 13 for level-specific messaging */
  level: 1 | 2 | 3;
  /** Forwarded to ResultCard in Task 13; shown in score display */
  passThreshold: number;
}

export function ExerciseFlow({ exercise, exerciseId, lessonId, level, passThreshold }: ExerciseFlowProps) {
  const [result, setResult] = useState<ExerciseSubmitResult>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(answer: ChartClickAnswer | MultipleChoiceAnswer) {
    setIsSubmitting(true);
    try {
      const res = await submitExerciseAttempt(lessonId, exerciseId, answer);
      setResult(res);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result.status === "success") {
    return (
      <div className="rounded-xl border p-6 text-center space-y-4 mt-6">
        {result.passed
          ? <p className="text-green-600 font-bold text-lg">כל הכבוד! עברת!</p>
          : <p className="text-red-600 font-bold text-lg">לא עברת.</p>
        }
        <p className="text-xs text-muted-foreground">רמה {level}</p>
        {result.score_pct !== undefined && (
          <p className="text-sm">ציון: {result.score_pct}% (נדרש {passThreshold}%)</p>
        )}
        {result.explanation && (
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        )}
        <Link
          href={`/lessons/${lessonId}/exercise`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 text-primary-foreground text-sm font-medium min-h-11"
        >
          המשך
        </Link>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3 text-center">
        <p className="text-destructive text-sm">{result.error}</p>
        <Link
          href={`/lessons/${lessonId}`}
          className="inline-flex items-center justify-center rounded-md border px-4 text-sm min-h-11"
        >
          חזרה לשיעור
        </Link>
      </div>
    );
  }

  if (exercise.type === "chart_click") {
    return (
      <ChartClickExercise
        exercise={exercise}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (exercise.type === "multiple_choice") {
    return (
      <QuizExercise
        exercise={exercise}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
      <p className="text-sm">סוג תרגיל זה אינו נתמך</p>
    </div>
  );
}
