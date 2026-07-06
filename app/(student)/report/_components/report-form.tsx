"use client";

import { useActionState, useEffect, useRef } from "react";
import { BugIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitBugReportAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle" };

const CATEGORIES = [
  { value: "lessons", label: "שיעורים" },
  { value: "exercises", label: "תרגילים" },
  { value: "summaries", label: "סיכומים" },
  { value: "market", label: "מניות" },
  { value: "other", label: "אחר" },
] as const;

export function ReportForm() {
  const [state, formAction, isPending] = useActionState(submitBugReportAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const pageUrlRef = useRef<HTMLInputElement>(null);
  const userAgentRef = useRef<HTMLInputElement>(null);

  function captureContext() {
    if (pageUrlRef.current) pageUrlRef.current.value = document.referrer || "";
    if (userAgentRef.current) userAgentRef.current.value = navigator.userAgent || "";
  }

  useEffect(() => {
    captureContext();
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      captureContext();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="page_url" ref={pageUrlRef} />
      <input type="hidden" name="user_agent" ref={userAgentRef} />

      <div className="space-y-2">
        <Label htmlFor="category">קטגוריה</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue="other"
          className="flex min-h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור התקלה</Label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          placeholder="תאר מה קרה, באיזה עמוד, ומה ציפית שיקרה..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.status === "success" && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <BugIcon className="size-4 shrink-0" aria-hidden="true" />
          הדיווח נשלח, תודה! נטפל בזה בהקדם.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11">
        {isPending ? "שולח..." : "שלח דיווח"}
      </Button>
    </form>
  );
}
