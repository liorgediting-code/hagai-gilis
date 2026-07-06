"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitFileUploadAction } from "../file-actions";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface Props {
  exerciseId: string;
  lessonId: string;
  content: FileUploadExercise;
  existing: { count: number; passed: boolean | null } | null;
}

export function FileUploadExercise({ exerciseId, lessonId, content, existing }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ passed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitFileUploadAction(formData);
      if (res.status === "error") setError(res.error ?? "שגיאה");
      else setDone({ passed: res.passed ?? false });
    });
  }

  const alreadyLabel =
    existing?.passed === true ? "ההגשה אושרה ✓" :
    existing?.passed === false ? "ההגשה נדחתה — ניתן להעלות שוב" :
    existing ? "ההגשה נשלחה — ממתינה לבדיקת המנהל" : null;

  if (done) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          {done.passed ? "הקובץ הועלה והתרגיל הושלם!" : "הקובץ נשלח וממתין לבדיקת המנהל"}
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
          <label htmlFor="files" className="text-sm font-medium">
            העלה {content.required_files} קבצים (תמונות או PDF)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            required
            accept="image/*,application/pdf"
            className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">נדרשים לפחות {content.required_files} קבצים · עד 10MB לקובץ</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "מעלה..." : "שלח הגשה"}
        </Button>
      </form>
    </div>
  );
}
