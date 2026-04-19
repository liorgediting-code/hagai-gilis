import Link from "next/link";
import { DumbbellIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

export default async function AdminExercisesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [{ data: students }, { data: exercises }, { data: allSubmissions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("full_name") as unknown as Promise<{ data: Profile[] | null; error: unknown }>,
    db.from("exercises").select("id") as unknown as Promise<{ data: Pick<ExerciseRow, "id">[] | null; error: unknown }>,
    db.from("exercise_submissions").select("user_id, exercise_id") as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "user_id" | "exercise_id">[] | null; error: unknown }>,
  ]);

  const totalExercises = (exercises ?? []).length;

  const submittedByUser = new Map<string, Set<string>>();
  for (const s of allSubmissions ?? []) {
    if (!submittedByUser.has(s.user_id)) submittedByUser.set(s.user_id, new Set());
    submittedByUser.get(s.user_id)!.add(s.exercise_id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">התקדמות בתרגולים</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            כל התלמידים — {totalExercises} תרגולים סה&quot;כ
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
                    <Link
                      href={`/admin/exercises/${student.id}`}
                      className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{student.full_name ?? "—"}</p>
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
