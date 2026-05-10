"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3 | null;
  onUpdate: (options: [string, string, string, string], correctIndex: 0 | 1 | 2 | 3) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep3Options({
  candles, supportLevels, resistanceLevels,
  options, correctOptionIndex, onUpdate, onNext, onBack,
}: Props) {
  function setOption(i: number, value: string) {
    const next = [...options] as [string, string, string, string];
    next[i] = value;
    onUpdate(next, correctOptionIndex ?? 0);
  }

  function setCorrect(i: 0 | 1 | 2 | 3) {
    onUpdate(options, i);
  }

  const canProceed =
    options.every((o) => o.trim().length > 0) && correctOptionIndex !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — אפשרויות תשובה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הזן 4 אפשרויות ובחר את התשובה הנכונה
        </p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={candles}
            mode="view-only"
            supportLevels={supportLevels}
            resistanceLevels={resistanceLevels}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-3 items-center">
            <button
              onClick={() => setCorrect(i as 0 | 1 | 2 | 3)}
              className={`size-8 shrink-0 rounded-full text-sm font-bold transition-colors ${
                correctOptionIndex === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              aria-label="סמן כתשובה נכונה"
              title="לחץ לסימון כתשובה נכונה"
            >
              {OPTION_LABELS[i]}
            </button>
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`אפשרות ${OPTION_LABELS[i]}`}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">לחץ על האות כדי לסמן כתשובה נכונה (צבע כתום = נכון)</p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 4</Button>
      </div>
    </div>
  );
}
