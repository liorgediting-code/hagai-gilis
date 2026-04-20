"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export default function ActivateAccountPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    forgotPasswordAction,
    initialState,
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          כניסה ראשונה — הפעלת חשבון
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הזן את האימייל שחגי הוסיף עבורך ונשלח לך קישור להגדרת סיסמה.
        </p>
      </div>

      {state.status === "success" ? (
        <div className="rounded-xl bg-primary/10 p-4 text-sm text-primary">
          נשלח קישור לאימייל שלך — בדוק את תיבת הדואר והכנס דרך הקישור.
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@example.com"
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
            {isPending ? "שולח..." : "שלח קישור להגדרת סיסמה"}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          כבר יש לי סיסמה — התחבר
        </Link>
      </div>
    </div>
  );
}
