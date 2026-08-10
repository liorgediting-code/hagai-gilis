import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewControls } from "@/app/admin/exercises/_components/review-controls";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";
import type { FileUploadAnswer, FileUploadExercise } from "@/lib/types/exercise-types";

type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "email">;

interface Props { params: Promise<{ id: string }> }

function statusLabel(passed: boolean | null): { text: string; cls: string } {
  if (passed === true) return { text: "אושר", cls: "text-primary" };
  if (passed === false) return { text: "נדחה", cls: "text-destructive" };
  return { text: "ממתין לבדיקה", cls: "text-amber-500" };
}

export default async function ExerciseSubmissionsPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: exercise } = (await db.from("exercises").select("*").eq("id", id).single()) as {
    data: ExerciseRow | null;
  };
  if (!exercise) notFound();
  const content = exercise.content_json as FileUploadExercise | null;
  if (!content || content.type !== "file_upload") notFound();

  const { data: subs } = (await db
    .from("exercise_submissions")
    .select("*")
    .eq("exercise_id", id)
    .order("submitted_at", { ascending: false })) as { data: ExerciseSubmissionRow[] | null };

  const submissions = subs ?? [];
  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const { data: profiles } = (await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])) as unknown as {
    data: Profile[] | null;
  };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Sign each stored file for download (1h).
  const signed = new Map<string, string>();
  for (const s of submissions) {
    const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
    for (const f of files) {
      const { data } = await supabase.storage.from("exercise-uploads").createSignedUrl(f.path, 3600);
      if (data?.signedUrl) signed.set(f.path, data.signedUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/exercises" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← תרגילים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">הגשות — {exercise.title}</h1>
        <p className="text-sm text-muted-foreground">{content.instructions}</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">הגשות תלמידים ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">עדיין אין הגשות.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {submissions.map((s) => {
                const p = profileMap.get(s.user_id);
                const answer = s.answer_data as FileUploadAnswer | null;
                const files = answer?.files ?? [];
                const textNote = answer?.text_note;
                const st = statusLabel(s.passed);
                return (
                  <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{p?.full_name ?? "תלמיד"}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{p?.email}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {files.map((f) => (
                          <a
                            key={f.path}
                            href={signed.get(f.path) ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-muted px-2 py-1 text-xs text-primary hover:underline"
                          >
                            {f.name}
                          </a>
                        ))}
                      </div>
                      {textNote && (
                        <p className="whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground">
                          {textNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${st.cls}`}>{st.text}</span>
                      <ReviewControls submissionId={s.id} exerciseId={exercise.id} passed={s.passed} />
                    </div>
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
