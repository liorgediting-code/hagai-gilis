"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  zone: AcceptanceZone | null;
  onZoneDraw: (zone: AcceptanceZone) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep3Zone({
  candles, supportLevels, resistanceLevels, zone, onZoneDraw, onNext, onBack,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — אזור קבלה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          גרור מלבן על הגרף להגדרת אזור התשובה הנכונה. לחיצת הסטודנט בתוך המלבן = נכון.
        </p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          {candles.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              חזור לשלב 2 והכנס נתוני CSV
            </div>
          ) : (
            <CandleChart
              candles={candles}
              mode="admin-draw"
              supportLevels={supportLevels}
              resistanceLevels={resistanceLevels}
              acceptanceZone={zone}
              onZoneDraw={onZoneDraw}
            />
          )}
        </CardContent>
      </Card>

      {zone ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-green-400">אזור קבלה מוגדר ✓</p>
          <p className="text-xs text-muted-foreground mt-1">
            מחיר: {zone.min_price.toFixed(1)} — {zone.max_price.toFixed(1)} |{" "}
            נרות: {zone.start_candle_index + 1} — {zone.end_candle_index + 1}
          </p>
          <button
            onClick={() => onZoneDraw({ min_price: 0, max_price: 0, start_candle_index: 0, end_candle_index: 0 })}
            className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
          >
            גרור שוב לשינוי
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">לחץ וגרור על הגרף להגדרת האזור</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!zone || zone.max_price === 0} className="min-h-11">
          המשך לשלב 4
        </Button>
      </div>
    </div>
  );
}
