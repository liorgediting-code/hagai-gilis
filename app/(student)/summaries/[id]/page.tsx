import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonRow, LessonSummaryRow } from "@/lib/types/course-types";

interface SummaryPageProps {
  params: Promise<{ id: string }>;
}

export default async function SummaryPage({ params }: SummaryPageProps) {
  await requirePageAccess("summaries");
  const { id } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: summary } = (await db
    .from("lesson_summaries")
    .select("*")
    .eq("lesson_id", id)
    .maybeSingle()) as { data: LessonSummaryRow | null; error: unknown };

  if (!summary) notFound();

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null; error: unknown };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/summaries" className="hover:text-foreground transition-colors">
          סיכומים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="text-foreground font-medium">{lesson?.title ?? "סיכום"}</span>
      </nav>

      <h1 className="font-heading text-2xl font-bold text-foreground">
        {lesson?.title ?? "סיכום שיעור"}
      </h1>

      <Card>
        <CardContent className="pt-6">
          <div
            className="text-sm text-foreground leading-relaxed
              [&>h1]:font-heading [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
              [&>h2]:font-heading [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5
              [&>h3]:font-heading [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4
              [&>p]:mt-3 [&>p]:leading-7
              [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:ps-6 [&>ul]:space-y-1
              [&>ol]:mt-3 [&>ol]:list-decimal [&>ol]:ps-6 [&>ol]:space-y-1
              [&>blockquote]:border-s-4 [&>blockquote]:border-primary/50 [&>blockquote]:ps-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>blockquote]:mt-3
              [&>pre]:mt-3 [&>pre]:rounded-xl [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:overflow-x-auto
              [&>hr]:my-6 [&>hr]:border-border/50"
          >
            <ReactMarkdown>{summary.body_markdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <Link
        href={`/lessons/${id}`}
        className="text-sm text-primary hover:underline"
      >
        חזור לשיעור
      </Link>
    </div>
  );
}
