"use client";

import { useActionState } from "react";
import { CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface SubmitExerciseButtonProps {
  exerciseId: string;
  hasSubmitted: boolean;
}

const initialState: ActionState = { status: "idle" };

export function SubmitExerciseButton({ exerciseId, hasSubmitted }: SubmitExerciseButtonProps) {
  const [state, formAction, isPending] = useActionState(submitExerciseAction, initialState);

  const submitted = hasSubmitted || state.status === "success";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" className="min-h-11">
          איפוס
        </Button>
        <form action={formAction}>
          <input type="hidden" name="exercise_id" value={exerciseId} />
          <Button type="submit" disabled={isPending} className="min-h-11">
            {isPending ? "שולח..." : submitted ? "שלח שוב" : "שלח תשובה"}
          </Button>
        </form>
      </div>

      {submitted && state.status === "success" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
          <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-primary">נשלח בהצלחה!</span>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </div>
  );
}
