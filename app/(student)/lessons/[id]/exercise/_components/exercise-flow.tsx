"use client";

import { useState } from "react";
import Link from "next/link";
import { submitExerciseAttempt } from "../actions";
import { ChartClickExercise } from "./chart-click-exercise";
import { QuizExercise } from "./quiz-exercise";
import { ResultCard } from "./result-card";
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
  /** Next lesson to continue to after passing the final level; null → all lessons. */
  nextLessonId: string | null;
}

export function ExerciseFlow({ exercise, exerciseId, lessonId, level, passThreshold, nextLessonId }: ExerciseFlowProps) {
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

  if (result.status === "success" && result.passed !== undefined) {
    return (
      <ResultCard
        passed={result.passed}
        scorePct={result.score_pct ?? (result.passed ? 100 : 0)}
        passThreshold={passThreshold}
        level={level}
        lessonId={lessonId}
        nextLessonId={nextLessonId}
        explanation={result.explanation}
        questionResults={result.question_results}
      />
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
