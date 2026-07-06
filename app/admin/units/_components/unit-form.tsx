"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { UnitRow } from "@/lib/types/course-types";

interface UnitFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  moduleId: string;
  defaultValues?: Partial<UnitRow>;
  unitId?: string;
}

const initialState: ActionState = { status: "idle" };

export function UnitForm({ action, moduleId, defaultValues, unitId }: UnitFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {unitId && <input type="hidden" name="id" value={unitId} />}
      <input type="hidden" name="module_id" value={moduleId} />

      <div className="space-y-2">
        <Label htmlFor="title">כותרת היחידה</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="לדוגמה: יחידה 1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור (אופציונלי)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="תיאור קצר של היחידה..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">סדר תצוגה</Label>
        <Input id="order_index" name="order_index" type="number" dir="ltr" min="0" required
          defaultValue={defaultValues?.order_index ?? 0} className="max-w-32" />
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      {state.status === "success" && <p className="text-sm text-primary">נשמר בהצלחה!</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : unitId ? "שמור שינויים" : "צור יחידה"}
        </Button>
        <Link href={`/admin/modules/${moduleId}/units`} className="text-sm text-muted-foreground hover:text-foreground">
          ביטול
        </Link>
      </div>
    </form>
  );
}
