import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionToggle } from "./_components/permission-toggle";
import type { Tables } from "@/lib/types/database";
import type { UserPermissionRow, LessonProgressRow, LessonRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const pageLabels: { page: "lessons" | "exercises" | "summaries"; label: string }[] = [
  { page: "lessons", label: "שיעורים" },
  { page: "exercises", label: "תרגולים" },
  { page: "summaries", label: "סיכומים" },
];

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "student")
    .single()) as { data: Profile | null; error: unknown };

  if (!profile) notFound();

  const { data: deniedRows } = (await db
    .from("user_permissions")
    .select("*")
    .eq("user_id", id)) as { data: UserPermissionRow[] | null; error: unknown };

  const denied = new Set((deniedRows ?? []).map((r) => r.page));

  const { data: progress } = (await db
    .from("lesson_progress")
    .select("*")
    .eq("user_id", id)) as { data: LessonProgressRow[] | null; error: unknown };

  const { data: lessons } = (await db
    .from("lessons")
    .select("id, title")
    .order("order_index")) as { data: Pick<LessonRow, "id" | "title">[] | null; error: unknown };

  const progressMap = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p]),
  );

  const completedCount = (progress ?? []).filter((p) => p.completed_at !== null).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/students" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          → רשימת תלמידים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {profile.full_name ?? "תלמיד"}
        </h1>
        <p className="text-sm text-muted-foreground" dir="ltr">{profile.email}</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי תלמיד</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-24">שם מלא:</dt>
              <dd className="font-medium">{profile.full_name ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-24">אימייל:</dt>
              <dd dir="ltr" className="font-medium">{profile.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-24">הצטרף:</dt>
              <dd className="font-medium">{formatDate(profile.created_at)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground min-w-24">שיעורים שהושלמו:</dt>
              <dd className="font-medium text-primary">{completedCount} / {(lessons ?? []).length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">הרשאות גישה לעמודים</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {pageLabels.map(({ page, label }) => (
            <PermissionToggle
              key={page}
              userId={id}
              page={page}
              label={label}
              isDenied={denied.has(page)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Progress */}
      {(lessons ?? []).length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold">התקדמות בשיעורים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/30">
              {(lessons ?? []).map((lesson) => {
                const p = progressMap.get(lesson.id);
                const completed = p?.completed_at != null;
                return (
                  <li key={lesson.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-foreground">{lesson.title}</span>
                    {completed ? (
                      <span className="text-xs font-medium text-primary">
                        הושלם {p?.completed_at ? formatDate(p.completed_at) : ""}
                      </span>
                    ) : p ? (
                      <span className="text-xs text-muted-foreground">
                        בתהליך ({p.last_position_seconds}s)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">לא נצפה</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
