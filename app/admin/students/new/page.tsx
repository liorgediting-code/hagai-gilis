"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, DicesIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { createStudentAction } from "@/app/admin/students/actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  // Rejection sampling avoids modulo bias toward the low end of the pool.
  const max = Math.floor(0x100000000 / chars.length) * chars.length;
  let result = "";
  const buf = new Uint32Array(1);
  while (result.length < 10) {
    crypto.getRandomValues(buf);
    if (buf[0] < max) result += chars[buf[0] % chars.length];
  }
  return result;
}

function CreateStudentForm({ onAddAnother }: { onAddAnother: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createStudentAction,
    initialState,
  );

  const [password, setPassword] = useState("");
  const summaryRef = useRef<{ email: string; password: string }>({
    email: "",
    password: "",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    summaryRef.current = {
      email: (fd.get("email") as string) ?? "",
      password: (fd.get("password") as string) ?? "",
    };
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4 text-sm text-foreground space-y-2">
          <p>התלמיד נוצר בהצלחה. שלח לו את הפרטים האלה כדי שיוכל להתחבר:</p>
          <div className="space-y-1 rounded-lg bg-background p-3 ring-1 ring-foreground/10">
            <p>
              <span className="text-muted-foreground">אימייל: </span>
              <span dir="ltr" className="font-medium">{summaryRef.current.email}</span>
            </p>
            <p>
              <span className="text-muted-foreground">סיסמה: </span>
              <span dir="ltr" className="font-medium">{summaryRef.current.password}</span>
            </p>
          </div>
          <p className="text-muted-foreground">
            התלמיד יוכל לשנות את הסיסמה בעצמו בהגדרות החשבון.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="min-h-11" onClick={onAddAnother}>
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
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
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

      <div className="space-y-1.5">
        <Label htmlFor="password">סיסמה</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            type="text"
            dir="ltr"
            autoComplete="new-password"
            placeholder="לפחות 8 תווים"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-11 shrink-0 px-0"
            aria-label="צור סיסמה אקראית"
            onClick={() => setPassword(generatePassword())}
          >
            <DicesIcon className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full min-h-11 h-11">
        {isPending ? "יוצר..." : "צור תלמיד"}
      </Button>
    </form>
  );
}

export default function NewStudentPage() {
  const [formKey, setFormKey] = useState(0);

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
        <CreateStudentForm
          key={formKey}
          onAddAnother={() => setFormKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
