import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionToggle } from "./_components/permission-toggle";
import { LessonUnlockControls } from "./_components/lesson-unlock-controls";
import { MarketPermissionToggle, type MarketState } from "./_components/market-permission-toggle";
import { DeleteStudentButton } from "./_components/delete-student-button";
import { FileSubmissionsCard } from "./_components/file-submissions-card";
import type { Tables } from "@/lib/types/database";
import type {
  UserPermissionRow,
  LessonProgressRow,
  LessonRow,
  LessonUnlockRow,
  ExerciseSubmissionRow,
} from "@/lib/types/course-types";

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

  const [
    { data: profile },
    { data: deniedRows },
    { data: progress },
    { data: lessons },
    { data: unlockRows },
    { data: passedL3Subs },
    { data: l3ExercisesData },
    { data: fileSubs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "student")
      .single() as unknown as Promise<{ data: Profile | null }>,
    supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", id) as unknown as Promise<{ data: UserPermissionRow[] | null }>,
    supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", id) as unknown as Promise<{ data: LessonProgressRow[] | null }>,
    supabase
      .from("lessons")
      .select("id, title, order_index")
      .order("order_index") as unknown as Promise<{
      data: Pick<LessonRow, "id" | "title" | "order_index">[] | null;
    }>,
    supabase
      .from("lesson_unlocks")
      .select("lesson_id")
      .eq("user_id", id) as unknown as Promise<{
      data: Pick<LessonUnlockRow, "lesson_id">[] | null;
    }>,
    supabase
      .from("exercise_submissions")
      .select("exercise_id, passed")
      .eq("user_id", id)
      .eq("passed", true) as unknown as Promise<{
      data: Pick<ExerciseSubmissionRow, "exercise_id" | "passed">[] | null;
    }>,
    supabase
      .from("exercises")
      .select("id, lesson_id")
      .eq("level", 3) as unknown as Promise<{
      data: { id: string; lesson_id: string }[] | null;
    }>,
    supabase
      .from("exercise_submissions")
      .select("id, exercise_id, answer_data, passed, submitted_at, exercises!inner(id, title, content_json)")
      .eq("user_id", id)
      .order("submitted_at", { ascending: false }) as unknown as Promise<{
      data: Array<{
        id: string;
        exercise_id: string;
        answer_data: unknown;
        passed: boolean | null;
        submitted_at: string;
        exercises: { id: string; title: string; content_json: { type?: string } | null };
      }> | null;
    }>,
  ]);

  if (!profile) notFound();

  const denied = new Set((deniedRows ?? []).map((r) => r.page));

  const hasMarketGrant = (deniedRows ?? []).some((r) => r.page === "market");
  const hasMarketDeny  = (deniedRows ?? []).some((r) => r.page === "market_deny");
  const allLessonsCompleted =
    (lessons ?? []).length > 0 &&
    (progress ?? []).filter((p) => p.completed_at !== null).length >= (lessons ?? []).length;

  const marketState: MarketState =
    hasMarketDeny   ? "blocked"     :
    hasMarketGrant  ? "early_grant" :
    allLessonsCompleted ? "auto_open" :
    "locked";

  const progressMap = new Map((progress ?? []).map((p) => [p.lesson_id, p]));

  const completedCount = (progress ?? []).filter((p) => p.completed_at !== null).length;

  const manualUnlockSet = new Set((unlockRows ?? []).map((r) => r.lesson_id));
  const passedL3ExIds = new Set(
    (passedL3Subs ?? []).filter((s) => s.passed).map((s) => s.exercise_id),
  );
  const lessonsWithPassedL3 = new Set(
    (l3ExercisesData ?? []).filter((e) => passedL3ExIds.has(e.id)).map((e) => e.lesson_id),
  );

  function getLockStatus(lesson: Pick<LessonRow, "id" | "order_index">): "auto" | "manual" | "locked" {
    if (lesson.order_index === 0) return "auto";
    if (manualUnlockSet.has(lesson.id)) return "manual";
    const allLessons = lessons ?? [];
    const prev = allLessons.find((l) => l.order_index === lesson.order_index - 1);
    if (prev && lessonsWithPassedL3.has(prev.id)) return "auto";
    return "locked";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/students" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← רשימת תלמידים
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
          <MarketPermissionToggle userId={id} marketState={marketState} />
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

      {/* Lesson unlock controls */}
      {(lessons ?? []).length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold">גישה לשיעורים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/30">
              {(lessons ?? []).map((lesson) => {
                const status = getLockStatus(lesson);
                return (
                  <li key={lesson.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{lesson.title}</span>
                      {status === "locked" && (
                        <span className="text-xs text-muted-foreground">🔒</span>
                      )}
                      {status === "auto" && (
                        <span className="text-xs text-primary">✓ פתוח</span>
                      )}
                      {status === "manual" && (
                        <span className="text-xs text-amber-500">פתוח ידנית</span>
                      )}
                    </div>
                    <LessonUnlockControls userId={id} lessonId={lesson.id} lockStatus={status} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* File submissions */}
      <FileSubmissionsCard submissions={fileSubs ?? []} />

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold text-destructive">
            אזור מסוכן
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            מחיקת התלמיד תסיר לצמיתות את חשבונו ואת כל הנתונים שלו. לא ניתן לשחזר.
          </p>
          <DeleteStudentButton
            userId={profile.id}
            fullName={profile.full_name}
            email={profile.email}
          />
        </CardContent>
      </Card>
    </div>
  );
}
