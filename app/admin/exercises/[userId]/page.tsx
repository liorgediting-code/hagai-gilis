import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";
import type { LessonRow, ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

interface AdminStudentExercisesPageProps {
  params: Promise<{ userId: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminStudentExercisesPage({ params }: AdminStudentExercisesPageProps) {
  await requireAdmin();
  const { userId } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("role", "student")
    .single()) as { data: Profile | null; error: unknown };

  if (!profile) notFound();

  const [{ data: lessons }, { data: exercises }, { data: submissions }] = await Promise.all([
    db.from("lessons").select("id, title").order("order_index") as unknown as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null; error: unknown }>,
    db.from("exercises").select("*").order("order_index") as unknown as Promise<{ data: ExerciseRow[] | null; error: unknown }>,
    db.from("exercise_submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: true }) as unknown as Promise<{ data: ExerciseSubmissionRow[] | null; error: unknown }>,
  ]);

  const exercisesByLesson = new Map<string, ExerciseRow[]>();
  for (const ex of exercises ?? []) {
    if (!exercisesByLesson.has(ex.lesson_id)) exercisesByLesson.set(ex.lesson_id, []);
    exercisesByLesson.get(ex.lesson_id)!.push(ex);
  }

  const submissionsByExercise = new Map<string, ExerciseSubmissionRow[]>();
  for (const s of submissions ?? []) {
    if (!submissionsByExercise.has(s.exercise_id)) submissionsByExercise.set(s.exercise_id, []);
    submissionsByExercise.get(s.exercise_id)!.push(s);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/exercises" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← חזרה להתקדמות תרגולים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {profile.full_name ?? "תלמיד"} — תרגולים
        </h1>
        <p className="text-sm text-muted-foreground" dir="ltr">{profile.email}</p>
      </div>

      {(lessons ?? []).map((lesson) => {
        const lessonExercises = exercisesByLesson.get(lesson.id) ?? [];
        if (lessonExercises.length === 0) return null;

        return (
          <Card key={lesson.id}>
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {lessonExercises.map((ex) => {
                const attempts = submissionsByExercise.get(ex.id) ?? [];
                return (
                  <div key={ex.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{ex.title}</p>
                      {attempts.length > 0 ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {attempts.length} {attempts.length === 1 ? "ניסיון" : "ניסיונות"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          טרם הוגש
                        </span>
                      )}
                    </div>

                    {attempts.length > 0 && (
                      <ul className="space-y-1 border-s-2 border-border/50 ps-3">
                        {attempts.map((attempt) => (
                          <li key={attempt.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">
                              ניסיון {attempt.attempt_number}
                            </span>
                            <span className="text-muted-foreground/70">
                              {formatDate(attempt.submitted_at)}
                            </span>
                            {attempt.answer_data != null && (
                              <span className="max-w-40 truncate font-mono text-muted-foreground/50">
                                {JSON.stringify(attempt.answer_data)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
