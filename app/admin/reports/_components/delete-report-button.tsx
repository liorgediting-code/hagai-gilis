"use client";

import { useActionState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteBugReportAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export function DeleteReportButton({ id }: { id: string }) {
  const [, formAction, isPending] = useActionState(deleteBugReportAction, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("למחוק את הדיווח?")) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
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
