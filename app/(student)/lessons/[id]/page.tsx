import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, FileTextIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { VideoPlayer } from "@/components/lesson/video-player";
import { MarkCompleteButton } from "@/app/(student)/_components/mark-complete-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, LessonSummaryRow } from "@/lib/types/course-types";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  await requirePageAccess("lessons");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null; error: unknown };

  if (!lesson) notFound();

  const { data: progress } = (await db
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", id)
    .maybeSingle()) as { data: LessonProgressRow | null; error: unknown };

  const { data: summary } = (await db
    .from("lesson_summaries")
    .select("lesson_id")
    .eq("lesson_id", id)
    .maybeSingle()) as { data: Pick<LessonSummaryRow, "lesson_id"> | null; error: unknown };

  const isCompleted = progress?.completed_at != null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/lessons" className="transition-colors hover:text-foreground">
          שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{lesson.title}</span>
      </nav>

      <h1 className="font-heading text-2xl font-bold text-foreground">{lesson.title}</h1>

      {/* Video */}
      <VideoPlayer videoUrl={lesson.video_url} />

      {/* Description */}
      {lesson.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <MarkCompleteButton lessonId={id} isCompleted={isCompleted} />

        {summary && (
          <Link
            href={`/summaries/${id}`}
            className={buttonVariants({ variant: "outline", className: "min-h-11 gap-2" })}
          >
            <FileTextIcon className="size-4" aria-hidden="true" />
            סכם את השיעור
          </Link>
        )}
      </div>
    </div>
  );
}
