"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { SanitizedMultipleChoiceExercise, MultipleChoiceAnswer, ExerciseSubmitResult } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  exerciseId: string;
  chartData: SanitizedMultipleChoiceExercise;
  hasSubmitted: boolean;
}

export function MultipleChoiceExercise({ exerciseId, chartData, hasSubmitted }: Props) {
  const [selected, setSelected] = useState<0 | 1 | 2 | 3 | null>(null);
  const [result, setResult] = useState<ExerciseSubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const locked = hasSubmitted || result?.status === "success";

  function handleSubmit() {
    if (selected === null) {
      setError("יש לבחור תשובה לפני השליחה");
      return;
    }
    const answer: MultipleChoiceAnswer = { selected_option_index: selected };
    const formData = new FormData();
    formData.set("exercise_id", exerciseId);
    formData.set("answer_data", JSON.stringify(answer));

    startTransition(async () => {
      const res = await submitExerciseAction({ status: "idle" }, formData);
      setResult(res);
      if (res.status === "error") setError(res.error ?? "שגיאה — נסה שנית");
    });
  }

  function handleRetry() {
    setResult(null);
    setSelected(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold leading-relaxed">{chartData.question}</p>
        </CardContent>
      </Card>

      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={chartData.candles}
            mode="view-only"
            supportLevels={chartData.support_levels}
            resistanceLevels={chartData.resistance_levels}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {chartData.options.map((option, i) => {
          const idx = i as 0 | 1 | 2 | 3;
          const isSelected = selected === idx;
          return (
            <button
              key={i}
              onClick={() => { if (!locked) { setSelected(idx); setError(null); } }}
              disabled={locked}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              } ${locked ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`size-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {OPTION_LABELS[i]}
              </span>
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      {result?.status === "success" && result && (
        <Card className={result.correct ? "border-green-500/40 bg-green-500/5" : "border-orange-500/40 bg-orange-500/5"}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start gap-2">
              {result.correct
                ? <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-500" />
                : <XCircleIcon className="mt-0.5 size-5 shrink-0 text-orange-500" />}
              <p className="text-sm font-medium">
                {result.correct ? "נכון מאוד!" : "לא בדיוק"}
              </p>
            </div>
            {result.explanation && (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!locked && (
        <Button onClick={handleSubmit} disabled={selected === null || isPending} className="w-full min-h-11 sm:w-auto">
          {isPending ? "שולח..." : "שלח תשובה"}
        </Button>
      )}

      {locked && (
        <Button variant="outline" onClick={handleRetry} className="w-full min-h-11 sm:w-auto">
          נסה שוב
        </Button>
      )}
    </div>
  );
}
