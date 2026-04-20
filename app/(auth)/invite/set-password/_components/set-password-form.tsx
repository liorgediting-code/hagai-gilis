"use client";

import { useState, useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setInvitePasswordAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface SetPasswordFormProps {
  userEmail: string;
}

const initialState: ActionState = { status: "idle" };

export function SetPasswordForm({ userEmail }: SetPasswordFormProps) {
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    setInvitePasswordAction,
    initialState,
  );

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emailInput.trim().toLowerCase() === userEmail.toLowerCase()) {
      setEmailError("");
      setEmailConfirmed(true);
    } else {
      setEmailError("האימייל לא תואם לחשבון שהוזמן — בדוק שוב");
    }
  }

  if (!emailConfirmed) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            כניסה ראשונה — הפעלת חשבון
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            הזן את האימייל שחגי הוסיף עבורך.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
          </div>

          {emailError && (
            <p role="alert" className="text-sm text-destructive">{emailError}</p>
          )}

          <Button type="submit" className="w-full min-h-11 h-11">
            המשך
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          בחר סיסמה
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הסיסמה חייבת להכיל לפחות 8 תווים.
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
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending} className="w-full min-h-11 h-11">
          {isPending ? "שומר..." : "שמור סיסמה וכנס"}
        </Button>
      </form>
    </div>
  );
}
