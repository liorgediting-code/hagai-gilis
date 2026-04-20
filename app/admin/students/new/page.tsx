"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { inviteStudentAction } from "@/app/admin/students/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

export default function NewStudentPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    inviteStudentAction,
    initialState,
  );

  const emailRef = useRef<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    emailRef.current = (fd.get("email") as string) ?? "";
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/students"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="חזרה לרשימת תלמידים"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          הוסף תלמיד
        </h1>
      </div>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 space-y-6">
        {state.status === "success" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
              {emailRef.current
                ? `הזמנה נשלחה ל-${emailRef.current}.`
                : "הזמנה נשלחה בהצלחה."}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  emailRef.current = "";
                  window.location.reload();
                }}
              >
                הוסף תלמיד נוסף
              </Button>
              <Link
                href="/admin/students"
                className={buttonVariants({ className: "min-h-11 h-11 px-4" })}
              >
                חזרה לרשימה
              </Link>
            </div>
          </div>
        ) : (
          <form
            action={formAction}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="full_name">שם מלא</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                dir="auto"
                autoComplete="name"
                placeholder="ישראל ישראלי"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="student@example.com"
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
              {isPending ? "שולח..." : "שלח הזמנה"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
