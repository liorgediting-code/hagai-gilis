"use client";

import { useState } from "react";
import { WizardStep0Lesson } from "./wizard-step-0-lesson";
import { WizardStep1Type } from "./wizard-step-1-type";
import { WizardStep2Data } from "./wizard-step-2-data";
import { WizardStep3Zone } from "./wizard-step-3-zone";
import { WizardStep3Quiz } from "./wizard-step-3-quiz";
import { WizardStep4Question } from "./wizard-step-4-question";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone, ChartClickExercise, MultipleChoiceQuestion } from "@/lib/types/exercise-types";

interface LessonOption {
  id: string;
  title: string;
}

interface WizardInitialData {
  editId?: string;
  type?: "chart_click" | "multiple_choice";
  csvRaw?: string;
  candles?: CandleData[];
  supportLevels?: PriceLine[];
  resistanceLevels?: PriceLine[];
  acceptanceZone?: AcceptanceZone;
  questions?: MultipleChoiceQuestion[];
  title?: string;
  question?: string;
  explanation?: string;
  lessonId?: string;
  orderIndex?: number;
  timeframe?: string;
  level?: number;
}

interface Props {
  lessons: LessonOption[];
  initial?: WizardInitialData;
}

const STEPS = ["נושא", "סוג", "נתונים", "אזור / תשובות", "שאלה"];

export function ExerciseWizard({ lessons, initial = {} }: Props) {
  const [step, setStep] = useState(0);
  const [exType, setExType] = useState<"chart_click" | "multiple_choice" | null>(initial.type ?? null);
  const [csvRaw, setCsvRaw] = useState(initial.csvRaw ?? "");
  const [candles, setCandles] = useState<CandleData[]>(initial.candles ?? []);
  const [supportLevels, setSupportLevels] = useState<PriceLine[]>(initial.supportLevels ?? []);
  const [resistanceLevels, setResistanceLevels] = useState<PriceLine[]>(initial.resistanceLevels ?? []);
  const [zone, setZone] = useState<AcceptanceZone | null>(initial.acceptanceZone ?? null);
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>(initial.questions ?? []);
  const [title, setTitle] = useState(initial.title ?? "");
  const [question, setQuestion] = useState(initial.question ?? "");
  const [explanation, setExplanation] = useState(initial.explanation ?? "");
  const [lessonId, setLessonId] = useState(initial.lessonId ?? "");
  const [orderIndex, setOrderIndex] = useState(initial.orderIndex ?? 0);
  const [timeframe, setTimeframe] = useState(initial.timeframe ?? "");
  const [level, setLevel] = useState<1 | 2 | 3>((initial.level as 1 | 2 | 3) ?? 1);

  function buildContentJson(): string {
    if (exType === "chart_click") {
      const ex: ChartClickExercise = {
        type: "chart_click",
        question,
        candles,
        support_levels: supportLevels,
        resistance_levels: resistanceLevels,
        acceptance_zone: zone!,
        explanation,
        ...(timeframe ? { timeframe } : {}),
      };
      return JSON.stringify(ex);
    } else {
      return JSON.stringify({
        type: "multiple_choice",
        candles,
        support_levels: supportLevels,
        resistance_levels: resistanceLevels,
        questions,
        ...(timeframe ? { timeframe } : {}),
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step ? "bg-primary/30 text-primary" :
              i === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 sm:w-10 ${i < step ? "bg-primary/50" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <WizardStep0Lesson
          lessons={lessons}
          selectedId={lessonId}
          onSelect={setLessonId}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <WizardStep1Type
          selected={exType}
          level={level}
          onSelect={setExType}
          onLevelChange={setLevel}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <WizardStep2Data
          csvRaw={csvRaw}
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          timeframe={timeframe}
          onUpdate={(data) => {
            setCsvRaw(data.csvRaw);
            setCandles(data.candles);
            setSupportLevels(data.supportLevels);
            setResistanceLevels(data.resistanceLevels);
            setTimeframe(data.timeframe);
          }}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && exType === "chart_click" && (
        <WizardStep3Zone
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          zone={zone}
          onZoneDraw={setZone}
          timeframe={timeframe}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 3 && exType === "multiple_choice" && (
        <WizardStep3Quiz
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          timeframe={timeframe}
          questions={questions}
          onUpdate={setQuestions}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <WizardStep4Question
          title={title}
          question={question}
          explanation={explanation}
          lessonId={lessonId}
          orderIndex={orderIndex}
          level={level}
          exType={exType!}
          contentJson={buildContentJson()}
          editId={initial.editId}
          onUpdate={(data) => {
            setTitle(data.title);
            setQuestion(data.question);
            setExplanation(data.explanation);
            setOrderIndex(data.orderIndex);
          }}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
