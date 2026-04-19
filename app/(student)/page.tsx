import Link from "next/link";
import { BookOpenIcon, FileTextIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { buttonVariants } from "@/components/ui/button";
import type { Tables } from "@/lib/types/database";
import type { LessonRow, LessonProgressRow, UserPermissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

export default async function StudentHomePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: profile },
    { data: lessons },
    { data: progress },
    { data: deniedRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single() as unknown as Promise<{
      data: Profile | null;
      error: unknown;
    }>,
    db.from("lessons").select("*").order("order_index") as unknown as Promise<{
      data: LessonRow[] | null;
      error: unknown;
    }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as unknown as Promise<{
      data: LessonProgressRow[] | null;
      error: unknown;
    }>,
    db.from("user_permissions").select("page").eq("user_id", user.id) as unknown as Promise<{
      data: UserPermissionRow[] | null;
      error: unknown;
    }>,
  ]);

  const denied = new Set((deniedRows ?? []).map((r) => r.page));
  const allLessons = lessons ?? [];
  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );

  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const totalCount = allLessons.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = allLessons.find((l) => !completedIds.has(l.id));

  const canSeeContent = !denied.has("lessons") || !denied.has("summaries");

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        שלום, {profile?.full_name ?? "תלמיד"} 👋
      </h1>

      {/* Continue card */}
      {nextLesson && !denied.has("lessons") && (
        <div className="rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="mb-1 text-sm opacity-80">ממשיך מאיפה שעצרת</p>
          <p className="mb-4 font-heading text-lg font-bold leading-snug">{nextLesson.title}</p>
          <Link
            href={`/lessons/${nextLesson.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/25"
          >
            <PlayCircleIcon className="size-4" aria-hidden="true" />
            המשך שיעור
          </Link>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && !denied.has("lessons") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">התקדמות בקורס</span>
            <span className="font-medium text-foreground">
              {completedCount} מתוך {totalCount} שיעורים
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick nav grid */}
      {canSeeContent && (
        <div className="grid grid-cols-2 gap-3">
          {!denied.has("lessons") && (
            <Link
              href="/lessons"
              className="flex min-h-20 flex-col items-start justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted/60"
            >
              <BookOpenIcon className="size-5 text-primary" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-foreground">כל השיעורים</span>
            </Link>
          )}
          {!denied.has("summaries") && (
            <Link
              href="/summaries"
              className="flex min-h-20 flex-col items-start justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted/60"
            >
              <FileTextIcon className="size-5 text-primary" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-foreground">סיכומים</span>
            </Link>
          )}
        </div>
      )}

      {totalCount === 0 && (
        <p className="text-sm text-muted-foreground">תכנים יתווספו בקרוב. חזור מאוחר יותר.</p>
      )}
    </div>
  );
}
