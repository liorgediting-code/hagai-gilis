"use client";

import { useActionState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteLessonAction } from "@/app/admin/lessons/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface DeleteLessonButtonProps {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
}

const initialState: ActionState = { status: "idle" };

export function DeleteLessonButton({ lessonId, lessonTitle, moduleId }: DeleteLessonButtonProps) {
  const [, formAction, isPending] = useActionState(deleteLessonAction, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`למחוק את השיעור "${lessonTitle}"?`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={lessonId} />
      <input type="hidden" name="module_id" value={moduleId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        className="gap-1.5 min-h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2Icon className="size-3.5" aria-hidden="true" />
        מחק
      </Button>
    </form>
  );
}
