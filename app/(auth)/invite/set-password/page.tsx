"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setInvitePasswordAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export default function SetInvitePasswordPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    setInvitePasswordAction,
    initialState,
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          ברוך הבא! בחר סיסמה
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          זהו השלב האחרון לפני הכניסה לפלטפורמה.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">סיסמה</Label>
          <Input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">אימות סיסמה</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11"
            required
          />
        </div>

        {state.status === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full min-h-11 h-11"
        >
          {isPending ? "שומר..." : "שמור סיסמה"}
        </Button>
      </form>
    </div>
  );
}
