import Link from "next/link";
import { DumbbellIcon, PlusIcon, PencilIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteExerciseFormAction } from "./actions";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow, LessonRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

type ExerciseListItem = Pick<ExerciseRow, "id" | "title" | "lesson_id" | "order_index"> & {
  content_json: { type?: string } | null;
};

export default async function AdminExercisesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: students },
    { data: exercises },
    { data: lessons },
    { data: allSubmissions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("full_name") as unknown as Promise<{ data: Profile[] | null }>,
    db.from("exercises").select("id, title, lesson_id, order_index, content_json").order("order_index") as unknown as Promise<{ data: ExerciseListItem[] | null }>,
    db.from("lessons").select("id, title") as unknown as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null }>,
    db.from("exercise_submissions").select("user_id, exercise_id") as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "user_id" | "exercise_id">[] | null }>,
  ]);

  const lessonMap = new Map((lessons ?? []).map((l) => [l.id, l.title]));
  const totalExercises = (exercises ?? []).length;

  const submittedByUser = new Map<string, Set<string>>();
  for (const s of allSubmissions ?? []) {
    if (!submittedByUser.has(s.user_id)) submittedByUser.set(s.user_id, new Set());
    submittedByUser.get(s.user_id)!.add(s.exercise_id);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold">תרגילים</h1>
        </div>
        <Link href="/admin/exercises/new" className={buttonVariants({ className: "min-h-11 h-11 px-4 gap-1.5" })}>
          <PlusIcon className="size-4" aria-hidden="true" />
          תרגיל חדש
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            כל התרגילים — {totalExercises} סה&quot;כ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(exercises ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">אין תרגילים עדיין.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {(exercises ?? []).map((ex) => (
                <li key={ex.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lessonMap.get(ex.lesson_id) ?? "—"} ·{" "}
                      <span className="text-primary">
                        {ex.content_json?.type === "chart_click" ? "לחיצה על גרף" :
                         ex.content_json?.type === "multiple_choice" ? "שאלה אמריקאית" : "ישן"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/exercises/edit/${ex.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      <PencilIcon className="size-4" aria-hidden="true" />
                      <span className="sr-only">ערוך</span>
                    </Link>
                    <form action={deleteExerciseFormAction}>
                      <input type="hidden" name="id" value={ex.id} />
                      <Button variant="ghost" size="sm" type="submit"
                        className="text-destructive hover:text-destructive">
                        מחק
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            התקדמות תלמידים — {totalExercises} תרגולים סה&quot;כ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(students ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">אין תלמידים רשומים.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {(students ?? []).map((student) => {
                const done = submittedByUser.get(student.id)?.size ?? 0;
                const pct = totalExercises > 0 ? Math.round((done / totalExercises) * 100) : 0;
                return (
                  <li key={student.id}>
                    <Link href={`/admin/exercises/${student.id}`}
                      className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{student.email}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold text-primary">{done}/{totalExercises}</p>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
