"use client";

import { useActionState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteMarketPostAction } from "@/app/admin/market/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface DeleteMarketPostButtonProps {
  postId: string;
  postTitle: string;
}

const initialState: ActionState = { status: "idle" };

export function DeleteMarketPostButton({ postId, postTitle }: DeleteMarketPostButtonProps) {
  const [, formAction, isPending] = useActionState(deleteMarketPostAction, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הפוסט "${postTitle}"?`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={postId} />
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
