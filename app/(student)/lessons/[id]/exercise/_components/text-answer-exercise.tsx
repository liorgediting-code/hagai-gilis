"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { submitTextAnswerAction } from "../text-actions";
import type { TextAnswerExercise } from "@/lib/types/exercise-types";

interface Props {
  exerciseId: string;
  lessonId: string;
  content: TextAnswerExercise;
  existing: { count: number; passed: boolean | null } | null;
  /** Next lesson to continue to once this task is complete; null → link to all lessons. */
  nextLessonId: string | null;
}

export function TextAnswerExercise({ exerciseId, lessonId, content, existing, nextLessonId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ passed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitTextAnswerAction(formData);
      if (res.status === "error") setError(res.error ?? "שגיאה");
      else setDone({ passed: res.passed ?? false });
    });
  }

  const nextHref = nextLessonId ? `/lessons/${nextLessonId}` : "/lessons";
  const nextLabel = nextLessonId ? "המשך לשיעור הבא" : "לכל השיעורים";

  const alreadyLabel =
    existing?.passed === true ? "ההגשה אושרה ✓" :
    existing?.passed === false ? "ההגשה נדחתה — ניתן לכתוב שוב" :
    existing ? "ההגשה נשלחה — ממתינה לבדיקת המנהל" : null;

  const isPassed = done?.passed || existing?.passed === true;

  if (isPassed) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-foreground">התרגיל הושלם!</p>
        <Link href={nextHref} className={buttonVariants({ className: "min-h-11" })}>
          {nextLabel}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          התשובה נשלחה וממתינה לבדיקת המנהל
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{content.instructions}</p>
      </div>

      {alreadyLabel && <p className="text-sm text-muted-foreground">{alreadyLabel}</p>}

      <form action={onSubmit} className="space-y-4">
        <input type="hidden" name="exercise_id" value={exerciseId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <div className="space-y-2">
          <label htmlFor="text" className="text-sm font-medium">
            כתוב את תשובתך
          </label>
          <textarea
            id="text"
            name="text"
            rows={8}
            required
            className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="כתוב כאן..."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שולח..." : "שלח הגשה"}
        </Button>
      </form>
    </div>
  );
}
