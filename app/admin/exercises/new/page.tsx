import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { ExerciseWizard } from "../_components/exercise-wizard";
import type { LessonRow } from "@/lib/types/course-types";

export default async function NewExercisePage() {
  await requireAdmin();
  const db = asUntyped(await createClient());
  const { data: lessons } = await db
    .from("lessons")
    .select("id, title")
    .order("order_index") as { data: Pick<LessonRow, "id" | "title">[] | null };

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/exercises" className="hover:text-foreground transition-colors">תרגילים</Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" />
        <span className="font-medium text-foreground">תרגיל חדש</span>
      </nav>
      <h1 className="font-heading text-2xl font-bold">יצירת תרגיל חדש</h1>
      <ExerciseWizard lessons={lessons ?? []} />
    </div>
  );
}
