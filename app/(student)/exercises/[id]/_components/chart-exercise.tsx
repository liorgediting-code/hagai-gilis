"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon, InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { CandleChartExercise } from "@/lib/types/course-types";

interface ChartExerciseProps {
  exerciseId: string;
  chartData: CandleChartExercise;
  hasSubmitted: boolean;
}

export function ChartExercise({
  exerciseId,
  chartData,
  hasSubmitted,
}: ChartExerciseProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(hasSubmitted);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(
    hasSubmitted ? null : null,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (selectedIndex === null) {
      setError("יש לבחור נר לפני השליחה");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("exercise_id", exerciseId);
    formData.set(
      "answer_data",
      JSON.stringify({ selected_candle_index: selectedIndex }),
    );

    startTransition(async () => {
      const result = await submitExerciseAction({ status: "idle" }, formData);
      if (result.status === "success") {
        setSubmitted(true);
        setIsCorrect(selectedIndex === chartData.correct_candle_index);
      } else if (result.status === "error") {
        setError(result.error);
      } else {
        setError("שגיאה בשמירת התשובה — נסה שנית");
      }
    });
  }

  function handleRetry() {
    setSubmitted(false);
    setSelectedIndex(null);
    setIsCorrect(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Question card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold text-foreground leading-relaxed">
            {chartData.question}
          </p>
          {!submitted && (
            <p className="mt-1 text-sm text-muted-foreground">
              לחץ על הנר שבחרת ואז &#39;שלח תשובה&#39;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart card */}
      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={chartData.candles}
            resistanceLevel={chartData.resistance_level}
            supportLevel={chartData.support_level}
            selectedIndex={selectedIndex}
            correctIndex={submitted ? chartData.correct_candle_index : null}
            showSolution={submitted}
            onCandleClick={submitted ? undefined : setSelectedIndex}
          />
        </CardContent>
      </Card>

      {/* Feedback card (post-submission) */}
      {submitted && (
        <Card
          className={
            isCorrect === true
              ? "border-green-500/40 bg-green-500/5"
              : isCorrect === false
                ? "border-orange-500/40 bg-orange-500/5"
                : "border-primary/40 bg-primary/5"
          }
        >
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start gap-2">
              {isCorrect === true && (
                <CheckCircleIcon
                  className="mt-0.5 size-5 shrink-0 text-green-500"
                  aria-hidden="true"
                />
              )}
              {isCorrect === false && (
                <XCircleIcon
                  className="mt-0.5 size-5 shrink-0 text-orange-500"
                  aria-hidden="true"
                />
              )}
              {isCorrect === null && (
                <InfoIcon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )}
              <p className="text-sm font-medium text-foreground">
                {isCorrect === true && "מעולה! זיהית נכון את פריצת השווא"}
                {isCorrect === false &&
                  "לא בדיוק — הנר הנכון מסומן בירוק בגרף"}
                {isCorrect === null &&
                  "תרגיל זה כבר הוגש — הנר הנכון מסומן בגרף"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {chartData.explanation}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit area (pre-submission) */}
      {!submitted && (
        <div className="space-y-2">
          <Button
            onClick={handleSubmit}
            disabled={selectedIndex === null || isPending}
            className="w-full min-h-11 sm:w-auto"
          >
            {isPending ? "שולח..." : "שלח תשובה"}
          </Button>

          {selectedIndex !== null && (
            <p className="text-xs text-muted-foreground">
              נר {selectedIndex + 1} מתוך {chartData.candles.length} נבחר
            </p>
          )}

          {error !== null && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}

      {/* Retry button (post-submission) */}
      {submitted && (
        <Button
          variant="outline"
          onClick={handleRetry}
          className="w-full min-h-11 sm:w-auto"
        >
          נסה שוב
        </Button>
      )}
    </div>
  );
}
