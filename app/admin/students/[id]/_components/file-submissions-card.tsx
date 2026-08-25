import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewControls } from "@/app/admin/exercises/_components/review-controls";
import type { FileUploadAnswer, TextAnswerAnswer } from "@/lib/types/exercise-types";

type FileSubmission = {
  id: string;
  exercise_id: string;
  answer_data: unknown;
  passed: boolean | null;
  submitted_at: string;
  exercises: { id: string; title: string; content_json: { type?: string } | null };
};

interface Props {
  submissions: FileSubmission[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function FileSubmissionsCard({ submissions }: Props) {
  const relevantSubs = submissions.filter(
    (s) => s.exercises.content_json?.type === "file_upload" || s.exercises.content_json?.type === "text_answer",
  );
  if (relevantSubs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="text-base font-semibold">הגשות קבצים וכתיבה</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/30">
          {relevantSubs.map((s) => {
            const isText = s.exercises.content_json?.type === "text_answer";
            const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
            const text = (s.answer_data as TextAnswerAnswer | null)?.text ?? "";
            const label = s.passed === true ? "אושר" : s.passed === false ? "נדחה" : "ממתין לבדיקה";
            const cls = s.passed === true ? "text-primary" : s.passed === false ? "text-destructive" : "text-amber-500";
            return (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Link
                    href={`/admin/exercises/${s.exercise_id}/submissions`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {s.exercises.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {isText ? `${text.length} תווים` : `${files.length} קבצים`} · {formatDate(s.submitted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${cls}`}>{label}</span>
                  <ReviewControls submissionId={s.id} exerciseId={s.exercise_id} passed={s.passed} />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
