"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { LessonRow } from "@/lib/types/course-types";

interface LessonFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: Partial<LessonRow>;
  lessonId?: string;
  moduleId: string;
}

const initialState: ActionState = { status: "idle" };

export function LessonForm({ action, defaultValues, lessonId, moduleId }: LessonFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {lessonId && <input type="hidden" name="id" value={lessonId} />}
      <input type="hidden" name="module_id" value={moduleId} />

      <div className="space-y-2">
        <Label htmlFor="title">כותרת השיעור</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder="לדוגמה: מבוא לנרות יפניים"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור (אופציונלי)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="תיאור קצר של השיעור..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video_url">כתובת וידאו (Bunny URL — אופציונלי)</Label>
        <textarea
          id="video_url"
          name="video_url"
          rows={2}
          dir="ltr"
          defaultValue={defaultValues?.video_url ?? ""}
          placeholder="https://iframe.mediadelivery.net/embed/..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">הדבק את כתובת ה-iframe מ-Bunny Stream</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">סדר תצוגה</Label>
        <Input
          id="order_index"
          name="order_index"
          type="number"
          dir="ltr"
          min="0"
          required
          defaultValue={defaultValues?.order_index ?? 0}
          className="max-w-32"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-primary">נשמר בהצלחה!</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : lessonId ? "שמור שינויים" : "צור שיעור"}
        </Button>
        <Link
          href={`/admin/modules/${moduleId}/lessons`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ביטול
        </Link>
      </div>
    </form>
  );
}
