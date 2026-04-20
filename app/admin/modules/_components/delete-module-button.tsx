"use client";

import { useActionState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteModuleAction } from "@/app/admin/modules/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface DeleteModuleButtonProps {
  moduleId: string;
  moduleTitle: string;
}

const initialState: ActionState = { status: "idle" };

export function DeleteModuleButton({ moduleId, moduleTitle }: DeleteModuleButtonProps) {
  const [, formAction, isPending] = useActionState(deleteModuleAction, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`למחוק את המודול "${moduleTitle}"? פעולה זו תמחק גם את כל השיעורים שבו.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={moduleId} />
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
