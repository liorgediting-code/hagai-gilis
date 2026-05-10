"use client";

import { useState } from "react";
import { WizardStep1Type } from "./wizard-step-1-type";
import { WizardStep2Data } from "./wizard-step-2-data";
import { WizardStep3Zone } from "./wizard-step-3-zone";
import { WizardStep3Options } from "./wizard-step-3-options";
import { WizardStep4Question } from "./wizard-step-4-question";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone, ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";

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
  options?: [string, string, string, string];
  correctOptionIndex?: 0 | 1 | 2 | 3;
  title?: string;
  question?: string;
  explanation?: string;
  lessonId?: string;
  orderIndex?: number;
}

interface Props {
  lessons: LessonOption[];
  initial?: WizardInitialData;
}

const STEPS = ["סוג", "נתונים", "אזור / תשובות", "שאלה"];

export function ExerciseWizard({ lessons, initial = {} }: Props) {
  const [step, setStep] = useState(initial.editId ? 1 : 0);
  const [exType, setExType] = useState<"chart_click" | "multiple_choice" | null>(initial.type ?? null);
  const [csvRaw, setCsvRaw] = useState(initial.csvRaw ?? "");
  const [candles, setCandles] = useState<CandleData[]>(initial.candles ?? []);
  const [supportLevels, setSupportLevels] = useState<PriceLine[]>(initial.supportLevels ?? []);
  const [resistanceLevels, setResistanceLevels] = useState<PriceLine[]>(initial.resistanceLevels ?? []);
  const [zone, setZone] = useState<AcceptanceZone | null>(initial.acceptanceZone ?? null);
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial.options ?? ["", "", "", ""]
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState<0 | 1 | 2 | 3 | null>(
    initial.correctOptionIndex ?? null
  );
  const [title, setTitle] = useState(initial.title ?? "");
  const [question, setQuestion] = useState(initial.question ?? "");
  const [explanation, setExplanation] = useState(initial.explanation ?? "");
  const [lessonId, setLessonId] = useState(initial.lessonId ?? "");
  const [orderIndex, setOrderIndex] = useState(initial.orderIndex ?? 0);

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
      };
      return JSON.stringify(ex);
    } else {
      const ex: MultipleChoiceExercise = {
        type: "multiple_choice",
        question,
        candles,
        support_levels: supportLevels,
        resistance_levels: resistanceLevels,
        options,
        correct_option_index: correctOptionIndex!,
        explanation,
      };
      return JSON.stringify(ex);
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
        <WizardStep1Type
          selected={exType}
          onSelect={setExType}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <WizardStep2Data
          csvRaw={csvRaw}
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          onUpdate={(data) => {
            setCsvRaw(data.csvRaw);
            setCandles(data.candles);
            setSupportLevels(data.supportLevels);
            setResistanceLevels(data.resistanceLevels);
          }}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && exType === "chart_click" && (
        <WizardStep3Zone
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          zone={zone}
          onZoneDraw={setZone}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && exType === "multiple_choice" && (
        <WizardStep3Options
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          options={options}
          correctOptionIndex={correctOptionIndex}
          onUpdate={(opts, idx) => { setOptions(opts); setCorrectOptionIndex(idx); }}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <WizardStep4Question
          title={title}
          question={question}
          explanation={explanation}
          lessonId={lessonId}
          orderIndex={orderIndex}
          lessons={lessons}
          contentJson={buildContentJson()}
          editId={initial.editId}
          onUpdate={(data) => {
            setTitle(data.title);
            setQuestion(data.question);
            setExplanation(data.explanation);
            setLessonId(data.lessonId);
            setOrderIndex(data.orderIndex);
          }}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
