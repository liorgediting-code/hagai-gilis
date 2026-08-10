"use client";

import { useActionState, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-11"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">סיסמה חדשה</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-11"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">אימות סיסמה חדשה</Label>
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

      {state.status === "success" && (
        <p role="status" className="text-sm text-primary">
          הסיסמה עודכנה בהצלחה
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full min-h-11 h-11">
        {isPending ? "מעדכן..." : "עדכן סיסמה"}
      </Button>
    </form>
  );
}
