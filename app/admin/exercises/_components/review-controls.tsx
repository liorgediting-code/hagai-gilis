"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { reviewFileSubmissionAction } from "@/app/admin/exercises/[id]/submissions/actions";

const initialState = { status: "idle" as const };

interface Props {
  submissionId: string;
  exerciseId: string;
  passed: boolean | null;
}

export function ReviewControls({ submissionId, exerciseId, passed }: Props) {
  const [state, formAction, isPending] = useActionState(reviewFileSubmissionAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="exercise_id" value={exerciseId} />
      <Button
        type="submit" name="passed" value="true" size="sm" disabled={isPending}
        variant={passed === true ? "default" : "outline"} className="min-h-9"
      >
        אושר
      </Button>
      <Button
        type="submit" name="passed" value="false" size="sm" disabled={isPending}
        variant={passed === false ? "default" : "outline"}
        className="min-h-9 text-destructive"
      >
        נדחה
      </Button>
      {state.status === "error" && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
