"use client";

import { useState } from "react";
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
  level: 1 | 2 | 3;
  passThreshold: number;
}

export function ExerciseFlow({ exercise, exerciseId, lessonId }: ExerciseFlowProps) {
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
        {result.explanation && (
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        )}
        <a
          href={`/lessons/${lessonId}/exercise`}
          className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium"
        >
          המשך
        </a>
      </div>
    );
  }

  if (result.status === "error") {
    return <p className="text-destructive text-sm">{result.error}</p>;
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
