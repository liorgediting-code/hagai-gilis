"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/app/(auth)/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    loginAction,
    initialState,
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          התחברות
        </h2>
      </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">סיסמה</Label>
          <Input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
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
          {isPending ? "מתחבר..." : "התחבר"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          שכחתי סיסמה
        </Link>
      </div>
    </div>
  );
}
