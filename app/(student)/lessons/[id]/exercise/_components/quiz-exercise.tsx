"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type {
  SanitizedMultipleChoiceExercise,
  MultipleChoiceAnswer,
} from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  exercise: SanitizedMultipleChoiceExercise;
  onSubmit: (answer: MultipleChoiceAnswer) => void;
  isSubmitting: boolean;
}

export function QuizExercise({ exercise, onSubmit, isSubmitting }: Props) {
  const [selectedIndices, setSelectedIndices] = useState<(0 | 1 | 2 | 3 | null)[]>(
    () => Array(exercise.questions.length).fill(null),
  );

  const allAnswered = selectedIndices.every((s) => s !== null);

  function selectOption(questionIndex: number, optionIndex: 0 | 1 | 2 | 3) {
    if (isSubmitting) return;
    setSelectedIndices((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  function handleSubmit() {
    if (!allAnswered || isSubmitting) return;
    onSubmit({
      selected_option_indices: selectedIndices as (0 | 1 | 2 | 3)[],
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={exercise.candles}
            mode="view-only"
            supportLevels={exercise.support_levels}
            resistanceLevels={exercise.resistance_levels}
            timeframe={exercise.timeframe}
          />
        </CardContent>
      </Card>

      <div className="space-y-8">
        {exercise.questions.map((q, qIndex) => {
          const selected = selectedIndices[qIndex];
          return (
            <div key={qIndex} className="space-y-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold leading-relaxed">
                    <span className="text-primary me-2">{qIndex + 1}.</span>
                    {q.question}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {q.options.map((option, oIndex) => {
                  const idx = oIndex as 0 | 1 | 2 | 3;
                  const isSelected = selected === idx;
                  return (
                    <button
                      key={oIndex}
                      onClick={() => selectOption(qIndex, idx)}
                      disabled={isSubmitting}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      } ${isSubmitting ? "cursor-default opacity-60" : "cursor-pointer"}`}
                    >
                      <span
                        className={`size-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {OPTION_LABELS[oIndex]}
                      </span>
                      <span className="text-sm">{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
        className="w-full min-h-11 sm:w-auto"
      >
        {isSubmitting ? "שולח..." : "שלח תשובה"}
      </Button>
    </div>
  );
}
