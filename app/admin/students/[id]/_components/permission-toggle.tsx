"use client";

import { useActionState } from "react";
import { LockIcon, UnlockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { togglePagePermissionAction } from "@/app/admin/students/permissions/actions";
import type { ActionState } from "@/app/(auth)/actions";
import type { PageKey } from "@/lib/types/course-types";

interface PermissionToggleProps {
  userId: string;
  page: PageKey;
  label: string;
  isDenied: boolean;
}

const initialState: ActionState = { status: "idle" };

export function PermissionToggle({ userId, page, label, isDenied }: PermissionToggleProps) {
  const [state, formAction, isPending] = useActionState(togglePagePermissionAction, initialState);

  return (
    <form action={formAction} className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        {isDenied ? (
          <LockIcon className="size-4 text-destructive" aria-hidden="true" />
        ) : (
          <UnlockIcon className="size-4 text-primary" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-foreground">{label}</span>
        {isDenied && (
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            חסום
          </span>
        )}
      </div>

      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="deny" value={isDenied ? "false" : "true"} />

      <Button
        type="submit"
        variant={isDenied ? "outline" : "ghost"}
        size="sm"
        disabled={isPending}
        className={`min-h-9 ${!isDenied ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
      >
        {isPending ? "..." : isDenied ? "שחזר גישה" : "חסום גישה"}
      </Button>

      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
