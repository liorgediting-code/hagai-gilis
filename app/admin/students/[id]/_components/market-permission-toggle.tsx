"use client";

import { useActionState } from "react";
import { LockIcon, UnlockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleMarketPermissionAction } from "@/app/admin/students/permissions/actions";
import type { ActionState } from "@/app/(auth)/actions";

export type MarketState = "locked" | "early_grant" | "auto_open" | "blocked";

interface MarketPermissionToggleProps {
  userId: string;
  marketState: MarketState;
}

const initial: ActionState = { status: "idle" };

function ActionForm({
  userId,
  action,
  label,
  variant,
  isPending,
  formAction,
}: {
  userId: string;
  action: string;
  label: string;
  variant: "default" | "outline" | "ghost" | "destructive";
  isPending: boolean;
  formAction: (payload: FormData) => void;
}) {
  return (
    <form action={formAction}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant={variant} size="sm" disabled={isPending} className="min-h-9">
        {isPending ? "..." : label}
      </Button>
    </form>
  );
}

export function MarketPermissionToggle({ userId, marketState }: MarketPermissionToggleProps) {
  const [state, formAction, isPending] = useActionState(toggleMarketPermissionAction, initial);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        {marketState === "blocked" ? (
          <LockIcon className="size-4 text-destructive" aria-hidden="true" />
        ) : marketState === "auto_open" || marketState === "early_grant" ? (
          <UnlockIcon className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <LockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-foreground">מניות</span>
        {marketState === "blocked" && (
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            חסום
          </span>
        )}
        {marketState === "early_grant" && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
            פתוח ידנית
          </span>
        )}
        {marketState === "auto_open" && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            הושלמו שיעורים
          </span>
        )}
        {marketState === "locked" && (
          <span className="text-xs text-muted-foreground">ממתין להשלמת שיעורים</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {marketState === "locked" && (
          <ActionForm userId={userId} action="grant" label="פתח גישה מוקדמת" variant="outline" isPending={isPending} formAction={formAction} />
        )}
        {marketState === "early_grant" && (
          <>
            <ActionForm userId={userId} action="revoke_grant" label="בטל פתיחה" variant="ghost" isPending={isPending} formAction={formAction} />
            <ActionForm userId={userId} action="deny" label="חסום" variant="destructive" isPending={isPending} formAction={formAction} />
          </>
        )}
        {marketState === "auto_open" && (
          <ActionForm userId={userId} action="deny" label="חסום גישה" variant="ghost" isPending={isPending} formAction={formAction} />
        )}
        {marketState === "blocked" && (
          <ActionForm userId={userId} action="revoke_deny" label="הסר חסימה" variant="outline" isPending={isPending} formAction={formAction} />
        )}
      </div>

      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}
