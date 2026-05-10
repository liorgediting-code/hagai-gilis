"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, MultipleChoiceQuestion } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  timeframe?: string;
  questions: MultipleChoiceQuestion[];
  onUpdate: (questions: MultipleChoiceQuestion[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const blankQuestion = (): MultipleChoiceQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correct_option_index: 0,
  explanation: "",
});

export function WizardStep3Quiz({
  candles, supportLevels, resistanceLevels, timeframe,
  questions, onUpdate, onNext, onBack,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number>(questions.length === 0 ? 0 : questions.length - 1);

  function addQuestion() {
    const next = [...questions, blankQuestion()];
    onUpdate(next);
    setExpandedIdx(next.length - 1);
  }

  function removeQuestion(i: number) {
    const next = questions.filter((_, idx) => idx !== i);
    onUpdate(next);
    setExpandedIdx(Math.min(expandedIdx, next.length - 1));
  }

  function updateQuestion(i: number, patch: Partial<MultipleChoiceQuestion>) {
    const next = questions.map((q, idx) => idx === i ? { ...q, ...patch } : q);
    onUpdate(next);
  }

  function setOption(qi: number, oi: number, value: string) {
    const opts = [...questions[qi].options] as [string, string, string, string];
    opts[oi] = value;
    updateQuestion(qi, { options: opts });
  }

  const canProceed =
    questions.length >= 1 &&
    questions.every(
      (q) =>
        q.question.trim() &&
        q.options.every((o) => o.trim()) &&
        q.explanation.trim(),
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — שאלות</h2>
        <p className="mt-1 text-sm text-muted-foreground">הגרף משותף לכל השאלות. הוסף שאלה אחת לפחות.</p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={candles}
            mode="view-only"
            supportLevels={supportLevels}
            resistanceLevels={resistanceLevels}
            timeframe={timeframe}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-border/50 bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
              onClick={() => setExpandedIdx(expandedIdx === qi ? -1 : qi)}
            >
              <span>
                שאלה {qi + 1}
                {q.question ? `: ${q.question.slice(0, 30)}${q.question.length > 30 ? "…" : ""}` : ""}
              </span>
              <span className="text-muted-foreground">{expandedIdx === qi ? "▲" : "▼"}</span>
            </button>

            {expandedIdx === qi && (
              <div className="space-y-4 border-t border-border/50 px-4 py-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">שאלה</label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="מה מראה הגרף?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">אפשרויות (לחץ על האות לסימון כנכונה)</label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, { correct_option_index: oi as 0 | 1 | 2 | 3 })}
                        className={`size-8 shrink-0 rounded-full text-sm font-bold transition-colors ${
                          q.correct_option_index === oi
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {OPTION_LABELS[oi]}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => setOption(qi, oi, e.target.value)}
                        placeholder={`אפשרות ${OPTION_LABELS[oi]}`}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">הסבר (לאחר מענה)</label>
                  <textarea
                    rows={2}
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="הסבר מדוע זו התשובה הנכונה..."
                  />
                </div>

                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qi)}
                    className="text-destructive hover:text-destructive min-h-9"
                  >
                    הסר שאלה
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addQuestion} className="min-h-11 w-full">
          + הוסף שאלה
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 4</Button>
      </div>
    </div>
  );
}
