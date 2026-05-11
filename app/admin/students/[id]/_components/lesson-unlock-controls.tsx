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
  const [unlockState, unlockAction, unlockPending] = useActionState(unlockLessonAction, initial);
  const [lockState, lockAction, lockPending] = useActionState(lockLessonAction, initial);

  if (lockStatus === "locked") {
    return (
      <form action={unlockAction}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <button
          type="submit"
          disabled={unlockPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 min-h-9 disabled:opacity-50"
        >
          {unlockPending ? "פותח..." : "פתח שיעור"}
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
          disabled={lockPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground min-h-9 disabled:opacity-50"
        >
          {lockPending ? "נועל..." : "נעל"}
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
