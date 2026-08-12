import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircleIcon, ChevronRightIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { flattenModuleLessons, nextLessonInSequence } from "@/lib/course/ordering";
import { checkLessonUnlocked } from "@/lib/course/access";
import { buttonVariants } from "@/components/ui/button";
import { ExerciseFlow } from "./_components/exercise-flow";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";
import type {
  ExerciseContent,
  SanitizedChartClickExercise,
  SanitizedMultipleChoiceExercise,
} from "@/lib/types/exercise-types";

// ── Types ────────────────────────────────────────────────────────────────────

type LevelState = 1 | 2 | 3 | "completed";

type SubmissionRow = {
  exercise_id: string;
  passed: boolean | null;
};

// ── Level determination ───────────────────────────────────────────────────────

function determineLevel(
  exercises: Array<{ id: string; level: number }>,
  submissions: SubmissionRow[],
): LevelState {
  const exercisesAtLevel = (lvl: number) => exercises.filter((e) => e.level === lvl);

  const hasPassedAtLevel = (lvl: number) =>
    exercisesAtLevel(lvl).some((e) =>
      submissions.some((s) => s.exercise_id === e.id && s.passed === true),
    );

  const hasSubmissionAtLevel = (lvl: number) =>
    exercisesAtLevel(lvl).some((e) => submissions.some((s) => s.exercise_id === e.id));

  if (hasPassedAtLevel(3)) return "completed";
  // Passing L1 or L2 advances to L3
  if (hasPassedAtLevel(1) || hasPassedAtLevel(2)) return 3;
  // L1 attempted but not passed → serve L2
  if (hasSubmissionAtLevel(1)) return 2;
  // Default: start at L1
  return 1;
}

// ── Exercise selection ────────────────────────────────────────────────────────

function pickExercise(
  exercises: ExerciseRow[],
  targetLevel: number,
  submissions: SubmissionRow[],
): ExerciseRow | null {
  const pool = exercises.filter((e) => e.level === targetLevel);
  if (pool.length === 0) return null;

  const passedIds = new Set(
    submissions.filter((s) => s.passed === true).map((s) => s.exercise_id),
  );
  const unpassedPool = pool.filter((e) => !passedIds.has(e.id));

  const candidates = unpassedPool.length > 0 ? unpassedPool : pool;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

// ── Content sanitization ──────────────────────────────────────────────────────

function sanitize(
  content: ExerciseContent,
): SanitizedChartClickExercise | SanitizedMultipleChoiceExercise | null {
  if (content.type === "chart_click") {
    const { acceptance_zone: _z, ...safe } = content;
    return safe;
  }
  if (content.type === "multiple_choice") {
    const sanitizedQuestions = content.questions.map(
      ({ correct_option_index: _c, explanation: _e, ...q }) => q,
    );
    return { ...content, questions: sanitizedQuestions };
  }
  return null;
}

// ── Level label ───────────────────────────────────────────────────────────────

function levelLabel(level: 1 | 2 | 3): string {
  return `רמה ${level}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExerciseFlowPage({ params }: Props) {
  await requirePageAccess("lessons");
  const { id: lessonId } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  // Fetch lesson
  const { data: lesson } = (await db
    .from("lessons")
    .select("id, title, order_index, unit_id, pass_threshold")
    .eq("id", lessonId)
    .single()) as {
    data: Pick<LessonRow, "id" | "title" | "order_index" | "unit_id" | "pass_threshold"> | null;
    error: unknown;
  };

  if (!lesson) notFound();

  // Exercises only open once the student has marked the lesson's video watched.
  const { data: ownProgress } = (await db
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle()) as { data: { completed_at: string | null } | null };
  if (ownProgress?.completed_at == null) redirect(`/lessons/${lessonId}`);

  // Exercises and the sibling unit row are both independent of one another
  // (unitRow only needs lesson.unit_id, already resolved) — fetch together.
  const [
    { data: exercisesRaw },
    { data: unitRow },
  ] = await Promise.all([
    (db
      .from("exercises")
      .select("id, lesson_id, title, description, order_index, level, content_json, created_at, updated_at")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true }) as unknown) as Promise<{
      data: ExerciseRow[] | null;
      error: unknown;
    }>,
    (db
      .from("units")
      .select("id, module_id, order_index")
      .eq("id", lesson.unit_id)
      .single() as unknown) as Promise<{ data: { id: string; module_id: string; order_index: number } | null }>,
  ]);

  const exercises = exercisesRaw ?? [];

  const chartExercises = exercises.filter((e) => {
    const t = (e.content_json as { type?: string } | null)?.type;
    return t === "chart_click" || t === "multiple_choice";
  });

  if (chartExercises.length === 0) notFound();

  // Next lesson in this module — powers the "continue" buttons after a pass.
  // Submissions (needs exerciseIds above) and module units (needs unitRow
  // above) are independent of each other — fetch together.
  const exerciseIds = chartExercises.map((e) => e.id);
  const [
    { data: submissionsRaw },
    { data: mUnits },
  ] = await Promise.all([
    (db
      .from("exercise_submissions")
      .select("exercise_id, passed")
      .eq("user_id", user.id)
      .in("exercise_id", exerciseIds) as unknown) as Promise<{ data: SubmissionRow[] | null; error: unknown }>,
    (db
      .from("units")
      .select("id, order_index, created_at")
      .eq("module_id", unitRow?.module_id ?? "")
      .order("order_index") as unknown) as Promise<{ data: { id: string; order_index: number; created_at: string }[] | null }>,
  ]);

  const submissions = submissionsRaw ?? [];

  const mUnitIds = (mUnits ?? []).map((u) => u.id);
  const { data: mLessons } = (await db
    .from("lessons")
    .select("*")
    .in("unit_id", mUnitIds.length > 0 ? mUnitIds : ["00000000-0000-0000-0000-000000000000"])) as {
    data: LessonRow[] | null;
  };

  const ordered = flattenModuleLessons(mUnits ?? [], mLessons ?? []);
  const nextLesson = nextLessonInSequence(ordered, lessonId);

  // Re-check the unlock rule server-side — the /lessons list hides the link,
  // but a direct URL to this lesson's exercise flow must not bypass the sequence.
  const currentIdx = ordered.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? ordered[currentIdx - 1] : null;
  if (!(await checkLessonUnlocked(supabase, user.id, lessonId, prevLesson))) {
    redirect("/lessons");
  }

  // Determine current level
  const levelState = determineLevel(chartExercises, submissions);

  // Completed state
  if (levelState === "completed") {
    return (
      <div className="space-y-6">
        <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/lessons" className="transition-colors hover:text-foreground">
            שיעורים
          </Link>
          <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          <Link
            href={`/lessons/${lessonId}`}
            className="transition-colors hover:text-foreground"
          >
            {lesson.title}
          </Link>
          <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          <span className="font-medium text-foreground">תרגול</span>
        </nav>

        <div className="flex flex-col items-center space-y-4 py-12 text-center">
          <CheckCircleIcon className="size-16 text-green-500" aria-hidden="true" />
          <h2 className="font-heading text-xl font-bold text-foreground">
            מצוין! סיימת את כל התרגולים בשיעור זה
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            {nextLesson && (
              <Link
                href={`/lessons/${nextLesson.id}`}
                className={buttonVariants({ className: "min-h-11" })}
              >
                לשיעור הבא: {nextLesson.title}
              </Link>
            )}
            <Link
              href="/lessons"
              className={buttonVariants({ variant: "outline", className: "min-h-11" })}
            >
              לכל השיעורים
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pick exercise for current level
  const targetLevel: 1 | 2 | 3 = levelState;
  const selectedExercise = pickExercise(chartExercises, targetLevel, submissions);

  // If no exercises exist at target level, show a graceful empty state
  if (!selectedExercise) {
    return (
      <div className="space-y-6">
        <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/lessons" className="transition-colors hover:text-foreground">
            שיעורים
          </Link>
          <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          <Link
            href={`/lessons/${lessonId}`}
            className="transition-colors hover:text-foreground"
          >
            {lesson.title}
          </Link>
          <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          <span className="font-medium text-foreground">תרגול</span>
        </nav>
        <div className="flex flex-col items-center space-y-4 py-12 text-center">
          <p className="text-muted-foreground">אין תרגולים זמינים ברמה זו כרגע</p>
          <Link
            href={`/lessons/${lessonId}`}
            className={buttonVariants({ variant: "outline", className: "min-h-11" })}
          >
            חזרה לשיעור
          </Link>
        </div>
      </div>
    );
  }

  // Sanitize content before passing to client
  const rawContent = selectedExercise.content_json as ExerciseContent | null;
  if (!rawContent || rawContent.type === "candle_chart_select") {
    // Legacy or unsupported exercise type — redirect back to lesson
    return (
      <div className="flex flex-col items-center space-y-4 py-12 text-center">
        <p className="text-muted-foreground">סוג תרגיל זה אינו נתמך בזרימה זו</p>
        <Link
          href={`/lessons/${lessonId}`}
          className={buttonVariants({ variant: "outline", className: "min-h-11" })}
        >
          חזרה לשיעור
        </Link>
      </div>
    );
  }

  const sanitized = sanitize(rawContent);
  if (!sanitized) {
    return (
      <div className="flex flex-col items-center space-y-4 py-12 text-center">
        <p className="text-muted-foreground">שגיאה בטעינת התרגיל</p>
        <Link
          href={`/lessons/${lessonId}`}
          className={buttonVariants({ variant: "outline", className: "min-h-11" })}
        >
          חזרה לשיעור
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/lessons" className="transition-colors hover:text-foreground">
          שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <Link
          href={`/lessons/${lessonId}`}
          className="transition-colors hover:text-foreground"
        >
          {lesson.title}
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">תרגול</span>
      </nav>

      {/* Level badge */}
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">{selectedExercise.title}</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {levelLabel(targetLevel)}
        </span>
      </div>

      {/* Exercise component */}
      <ExerciseFlow
        exercise={sanitized}
        exerciseId={selectedExercise.id}
        lessonId={lessonId}
        level={targetLevel}
        passThreshold={lesson.pass_threshold}
        nextLessonId={nextLesson?.id ?? null}
      />
    </div>
  );
}
