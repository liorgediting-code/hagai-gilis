"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { SanitizedChartClickExercise, ChartClickAnswer, ExerciseSubmitResult } from "@/lib/types/exercise-types";

interface Props {
  exerciseId: string;
  chartData: SanitizedChartClickExercise;
  hasSubmitted: boolean;
}

export function ChartExercise({ exerciseId, chartData, hasSubmitted }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<{ price: number; candleIndex: number } | null>(null);
  const [result, setResult] = useState<ExerciseSubmitResult | null>(hasSubmitted ? { status: "success" } : null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitted = result?.status === "success";

  function handlePointClick(price: number, candleIndex: number) {
    if (submitted) return;
    setSelectedPoint({ price, candleIndex });
    setError(null);
  }

  function handleSubmit() {
    if (!selectedPoint) {
      setError("יש לסמן נקודה על הגרף לפני השליחה");
      return;
    }
    const answer: ChartClickAnswer = {
      clicked_price: selectedPoint.price,
      clicked_candle_index: selectedPoint.candleIndex,
    };
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
    setSelectedPoint(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold leading-relaxed">{chartData.question}</p>
          {!submitted && (
            <p className="mt-1 text-sm text-muted-foreground">לחץ על הגרף לסימון הנקודה</p>
          )}
        </CardContent>
      </Card>

      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={chartData.candles}
            mode={submitted ? "view-only" : "student-click"}
            supportLevels={chartData.support_levels}
            resistanceLevels={chartData.resistance_levels}
            selectedPoint={submitted ? null : selectedPoint}
            onPointClick={submitted ? undefined : handlePointClick}
          />
        </CardContent>
      </Card>

      {selectedPoint && !submitted && (
        <p className="text-xs text-muted-foreground">
          נבחר: נר {selectedPoint.candleIndex + 1} | מחיר ₪{selectedPoint.price.toFixed(1)}
        </p>
      )}

      {submitted && result && (
        <Card className={result.correct ? "border-green-500/40 bg-green-500/5" : "border-orange-500/40 bg-orange-500/5"}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start gap-2">
              {result.correct
                ? <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-500" />
                : <XCircleIcon className="mt-0.5 size-5 shrink-0 text-orange-500" />}
              <p className="text-sm font-medium">
                {result.correct ? "מצוין! הנקודה בתוך אזור הקבלה" : "לא בדיוק — הנקודה מחוץ לאזור הנכון"}
              </p>
            </div>
            {result.explanation && (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!selectedPoint || isPending} className="w-full min-h-11 sm:w-auto">
          {isPending ? "שולח..." : "שלח תשובה"}
        </Button>
      )}

      {submitted && (
        <Button variant="outline" onClick={handleRetry} className="w-full min-h-11 sm:w-auto">
          נסה שוב
        </Button>
      )}
    </div>
  );
}
