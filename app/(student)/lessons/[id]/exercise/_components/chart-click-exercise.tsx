"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type {
  SanitizedChartClickExercise,
  ChartClickAnswer,
} from "@/lib/types/exercise-types";

interface Props {
  exercise: SanitizedChartClickExercise;
  onSubmit: (answer: ChartClickAnswer) => void;
  isSubmitting: boolean;
}

export function ChartClickExercise({ exercise, onSubmit, isSubmitting }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<{
    price: number;
    candleIndex: number;
  } | null>(null);

  function handlePointClick(price: number, candleIndex: number) {
    if (isSubmitting) return;
    setSelectedPoint({ price, candleIndex });
  }

  function handleSubmit() {
    if (!selectedPoint || isSubmitting) return;
    onSubmit({
      clicked_price: selectedPoint.price,
      clicked_candle_index: selectedPoint.candleIndex,
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold leading-relaxed">{exercise.question}</p>
          <p className="mt-1 text-sm text-muted-foreground">לחץ על הגרף לסימון הנקודה</p>
        </CardContent>
      </Card>

      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={exercise.candles}
            mode="student-click"
            supportLevels={exercise.support_levels}
            resistanceLevels={exercise.resistance_levels}
            selectedPoint={selectedPoint}
            onPointClick={handlePointClick}
            timeframe={exercise.timeframe}
          />
        </CardContent>
      </Card>

      {selectedPoint && (
        <p className="text-xs text-muted-foreground">
          נבחר: נר {selectedPoint.candleIndex + 1} | מחיר ₪{selectedPoint.price.toFixed(1)}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selectedPoint || isSubmitting}
        className="w-full min-h-11 sm:w-auto"
      >
        {isSubmitting ? "שולח..." : "שלח תשובה"}
      </Button>
    </div>
  );
}
