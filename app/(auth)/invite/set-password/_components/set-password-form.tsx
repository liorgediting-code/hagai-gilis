"use client";

import { useState, useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { activateAccountAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export function SetPasswordForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    activateAccountAction,
    initialState,
  );

  if (step === "email") {
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) setStep("password");
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

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
          מגדיר סיסמה עבור <span dir="ltr" className="font-medium">{email}</span>
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />

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
          {isPending ? "מגדיר..." : "שמור סיסמה וכנס"}
        </Button>

        <button
          type="button"
          onClick={() => setStep("email")}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          חזור לשינוי אימייל
        </button>
      </form>
    </div>
  );
}
