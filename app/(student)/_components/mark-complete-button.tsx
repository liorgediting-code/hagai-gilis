"use client";

import { useActionState } from "react";
import { CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveLessonProgressAction } from "@/app/(student)/lessons/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface MarkCompleteButtonProps {
  lessonId: string;
  isCompleted: boolean;
}

const initialState: ActionState = { status: "idle" };

export function MarkCompleteButton({ lessonId, isCompleted }: MarkCompleteButtonProps) {
  const [state, formAction, isPending] = useActionState(saveLessonProgressAction, initialState);

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
        <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-primary">השיעור הושלם</span>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="last_position_seconds" value="0" />
      <input type="hidden" name="completed" value="true" />
      <Button type="submit" disabled={isPending} className="min-h-11 w-full sm:w-auto">
        {isPending ? "שומר..." : "סמן כהושלם"}
      </Button>
      {state.status === "error" && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
