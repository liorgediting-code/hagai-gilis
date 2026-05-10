"use client";

import { useActionState } from "react";

import { unlockLessonAction, lockLessonAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";

interface Props {
  userId: string;
  lessonId: string;
  lockStatus: "auto" | "manual" | "locked";
}

const initial: ActionState = { status: "idle" };

export function LessonUnlockControls({ userId, lessonId, lockStatus }: Props) {
  const [unlockState, unlockAction] = useActionState(unlockLessonAction, initial);
  const [lockState, lockAction] = useActionState(lockLessonAction, initial);

  if (lockStatus === "locked") {
    return (
      <form action={unlockAction}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 min-h-9"
        >
          פתח שיעור
        </button>
        {unlockState.status === "error" && (
          <span className="text-xs text-destructive ms-2">{unlockState.error}</span>
        )}
      </form>
    );
  }

  if (lockStatus === "manual") {
    return (
      <form action={lockAction}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground min-h-9"
        >
          נעל
        </button>
        {lockState.status === "error" && (
          <span className="text-xs text-destructive ms-2">{lockState.error}</span>
        )}
      </form>
    );
  }

  // auto-unlocked: no action needed
  return <span className="text-xs text-muted-foreground">אוטומטי</span>;
}
