"use client";

import { useActionState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { createExerciseAction, updateExerciseAction } from "@/app/admin/exercises/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface Props {
  title: string;
  question: string;
  explanation: string;
  lessonId: string;
  orderIndex: number;
  level: 1 | 2 | 3;
  exType: "chart_click" | "multiple_choice";
  contentJson: string;
  editId?: string;
  onUpdate: (data: {
    title: string;
    question: string;
    explanation: string;
    orderIndex: number;
  }) => void;
  onBack: () => void;
}

const initialState: ActionState = { status: "idle" };

export function WizardStep4Question({
  title, question, explanation, lessonId, orderIndex,
  level, exType, contentJson, editId, onUpdate, onBack,
}: Props) {
  const action = editId ? updateExerciseAction : createExerciseAction;
  const [state, formAction] = useActionState(action, initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-2xl">✓</p>
        <p className="font-semibold text-lg">{editId ? "התרגיל עודכן בהצלחה" : "התרגיל נשמר בהצלחה"}</p>
        <Link href="/admin/exercises" className={buttonVariants({ className: "min-h-11 h-11 px-4" })}>חזור לרשימת התרגילים</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {editId && <input type="hidden" name="id" value={editId} />}
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="content_json" value={contentJson} />
      <input type="hidden" name="lesson_id" value={lessonId} />

      <div>
        <h2 className="font-heading text-lg font-bold">שלב 5 — שאלה והסבר</h2>
        <p className="mt-1 text-sm text-muted-foreground">הגדר את הטקסט שהסטודנט יראה ואת המטא-נתונים</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="title">כותרת תרגיל</label>
          <input id="title" name="title" type="text" required
            defaultValue={title}
            onChange={(e) => onUpdate({ title: e.target.value, question, explanation, orderIndex })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        {exType === "chart_click" && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="question">שאלה</label>
              <textarea id="question" required rows={3}
                defaultValue={question}
                onChange={(e) => onUpdate({ title, question: e.target.value, explanation, orderIndex })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                name="__question_display" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="explanation">הסבר (לאחר מענה)</label>
              <textarea id="explanation" required rows={3}
                defaultValue={explanation}
                onChange={(e) => onUpdate({ title, question, explanation: e.target.value, orderIndex })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                name="__explanation_display" />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="order_index">סדר</label>
          <input id="order_index" name="order_index" type="number" min={0} required
            defaultValue={orderIndex}
            onChange={(e) => onUpdate({ title, question, explanation, orderIndex: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            dir="ltr" />
        </div>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : editId ? "עדכן תרגיל" : "שמור תרגיל"}
        </Button>
      </div>
    </form>
  );
}
