"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface LessonOption { id: string; title: string }

interface Props {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  lessons: LessonOption[];
  exerciseId?: string;
  defaultLessonId?: string;
  defaultTitle?: string;
  defaultOrderIndex?: number;
  defaultContent?: FileUploadExercise;
}

const initialState: ActionState = { status: "idle" };

export function FileExerciseForm({
  action, lessons, exerciseId, defaultLessonId, defaultTitle, defaultOrderIndex, defaultContent,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [allowTextAnswer, setAllowTextAnswer] = useState(defaultContent?.allow_text_answer ?? false);

  return (
    <form action={formAction} className="space-y-5">
      {exerciseId && <input type="hidden" name="id" value={exerciseId} />}

      <div className="space-y-2">
        <Label htmlFor="lesson_id">שיעור משויך</Label>
        <select
          id="lesson_id"
          name="lesson_id"
          required
          defaultValue={defaultLessonId ?? ""}
          className="flex min-h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="" disabled>בחר שיעור</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">כותרת התרגיל</Label>
        <Input id="title" name="title" required defaultValue={defaultTitle} placeholder="לדוגמה: העלאת ניתוח גרף" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">הוראות (יוצגו מעל התרגיל)</Label>
        <textarea
          id="instructions"
          name="instructions"
          rows={5}
          required
          defaultValue={defaultContent?.instructions ?? ""}
          placeholder="הסבר לתלמיד מה עליו להעלות..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_files">מקסימום קבצים</Label>
        <Input id="max_files" name="max_files" type="number" dir="ltr" min="1" max="10" required
          defaultValue={defaultContent?.max_files ?? defaultContent?.required_files ?? 1} className="max-w-32" />
        <p className="text-xs text-muted-foreground">התלמיד יוכל להעלות עד מספר זה של קבצים.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="completion_mode">אופן השלמה</Label>
        <select
          id="completion_mode"
          name="completion_mode"
          required
          defaultValue={defaultContent?.completion_mode ?? "manual_review"}
          className="flex min-h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="manual_review">דורש בדיקה ידנית של המנהל</option>
          <option value="auto_complete">מושלם אוטומטית עם ההעלאה</option>
        </select>
        <p className="text-xs text-muted-foreground">
          בדיקה ידנית: התלמיד מסמן &quot;ממתין לבדיקה&quot; עד שהמנהל מאשר. אוטומטי: התרגיל מושלם מיד עם ההעלאה.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="allow_text_answer"
            name="allow_text_answer"
            type="checkbox"
            defaultChecked={defaultContent?.allow_text_answer ?? false}
            onChange={(e) => setAllowTextAnswer(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <Label htmlFor="allow_text_answer">אפשר לתלמיד להשאיר הערת טקסט (אופציונלי)</Label>
        </div>
        {allowTextAnswer && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="text_prompt">טקסט ההנחיה לתלמיד</Label>
            <Input
              id="text_prompt"
              name="text_prompt"
              defaultValue={defaultContent?.text_prompt ?? ""}
              placeholder="לדוגמה: נמק את בחירתך"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">סדר תצוגה</Label>
        <Input id="order_index" name="order_index" type="number" dir="ltr" min="0" required
          defaultValue={defaultOrderIndex ?? 0} className="max-w-32" />
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      {state.status === "success" && <p className="text-sm text-primary">נשמר בהצלחה!</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : exerciseId ? "שמור שינויים" : "צור תרגיל"}
        </Button>
        <Link href="/admin/exercises" className="text-sm text-muted-foreground hover:text-foreground">ביטול</Link>
      </div>
    </form>
  );
}
