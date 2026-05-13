import { redirect } from "next/navigation";
import { TrendingUpIcon, LockIcon, CalendarIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketPostRow, LessonProgressRow } from "@/lib/types/course-types";
import type { Tables } from "@/lib/types/database";

type UserPermissionRow = Tables<"user_permissions">;
type LessonRow = { id: string };

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function MarketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const db = asUntyped(supabase);

  const [
    { data: grantRow },
    { data: denyRow },
    { data: allLessons },
    { data: progressRows },
    { data: posts },
  ] = await Promise.all([
    db
      .from("user_permissions")
      .select("page")
      .eq("user_id", user.id)
      .eq("page", "market")
      .maybeSingle() as unknown as Promise<{ data: UserPermissionRow | null }>,
    db
      .from("user_permissions")
      .select("page")
      .eq("user_id", user.id)
      .eq("page", "market_deny")
      .maybeSingle() as unknown as Promise<{ data: UserPermissionRow | null }>,
    db
      .from("lessons")
      .select("id") as unknown as Promise<{ data: LessonRow[] | null }>,
    db
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", user.id) as unknown as Promise<{
      data: Pick<LessonProgressRow, "lesson_id" | "completed_at">[] | null;
    }>,
    db
      .from("market_posts")
      .select("*")
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: MarketPostRow[] | null;
    }>,
  ]);

  const hasExplicitGrant = grantRow !== null;
  const hasExplicitDeny  = denyRow !== null;

  const lessonCount = (allLessons ?? []).length;
  const completedCount = (progressRows ?? []).filter(
    (p) => p.completed_at !== null,
  ).length;
  const allLessonsCompleted = lessonCount > 0 && completedCount >= lessonCount;

  const isGranted = !hasExplicitDeny && (hasExplicitGrant || allLessonsCompleted);

  if (!isGranted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold text-foreground">מניות</h1>
        </div>

        <Card className="rounded-xl border border-border/50">
          <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-muted">
              <LockIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h2 className="font-heading text-lg font-bold text-foreground">
                העמוד נעול
              </h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                גישה לעדכוני המניות תינתן לאחר השלמת כל השיעורים, או בהרשאה ישירה מהמדריך.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-5 py-3">
              <span className="text-sm font-semibold text-foreground">
                {completedCount} / {lessonCount} שיעורים הושלמו
              </span>
              {lessonCount > 0 && (
                <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((completedCount / lessonCount) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const feedPosts: MarketPostRow[] = posts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">עדכוני מניות</h1>
      </div>

      {feedPosts.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עדכונים עדיין. חזור בקרוב.</p>
      ) : (
        <div className="space-y-4">
          {feedPosts.map((post) => (
            <Card key={post.id} className="rounded-xl border border-border/50">
              <CardHeader className="border-b border-border/50 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-bold leading-snug text-foreground">
                    {post.title}
                  </CardTitle>
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                  >
                    <CalendarIcon className="size-3.5" aria-hidden="true" />
                    {formatDate(post.created_at)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {post.image_url && (
                  <div className="mb-4 overflow-hidden rounded-xl">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {post.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
