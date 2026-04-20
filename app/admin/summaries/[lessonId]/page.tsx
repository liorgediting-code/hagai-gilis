import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryEditor } from "./_components/summary-editor";
import type { LessonRow, LessonSummaryRow } from "@/lib/types/course-types";

interface SummaryEditorPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function AdminSummaryPage({ params }: SummaryEditorPageProps) {
  await requireAdmin();
  const { lessonId } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single()) as { data: LessonRow | null; error: unknown };

  if (!lesson) notFound();

  const { data: summary } = (await db
    .from("lesson_summaries")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle()) as { data: LessonSummaryRow | null; error: unknown };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/admin/modules/${lesson.module_id}/lessons`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← חזור לרשימת השיעורים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          עריכת סיכום — {lesson.title}
        </h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">סיכום השיעור</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <SummaryEditor
            lessonId={lessonId}
            initialBody={summary?.body_markdown ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
