"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ExerciseRow } from "@/lib/types/course-types";
import { getMaxFiles } from "@/lib/types/exercise-types";
import type { FileUploadExercise, UploadedFile } from "@/lib/types/exercise-types";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB per file

export type FileSubmitResult = { status: "idle" | "success" | "error"; error?: string; passed?: boolean };

export async function submitFileUploadAction(formData: FormData): Promise<FileSubmitResult> {
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as { data: { user: { id: string } | null } };
  if (!user) return { status: "error", error: "לא מחובר" };

  const exerciseId = formData.get("exercise_id");
  const lessonId = formData.get("lesson_id");
  const uuid = z.string().uuid();
  if (typeof exerciseId !== "string" || !uuid.safeParse(exerciseId).success ||
      typeof lessonId !== "string" || !uuid.safeParse(lessonId).success) {
    return { status: "error", error: "מזהה לא תקין" };
  }

  // Re-fetch exercise server-side — never trust client content.
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("id, lesson_id, content_json")
    .eq("id", exerciseId)
    .single()) as { data: Pick<ExerciseRow, "id" | "lesson_id" | "content_json"> | null };
  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };
  if (exercise.lesson_id !== lessonId) return { status: "error", error: "תרגיל לא שייך לשיעור זה" };

  const content = exercise.content_json as FileUploadExercise | null;
  if (!content || content.type !== "file_upload") return { status: "error", error: "סוג תרגיל שגוי" };

  const maxFiles = getMaxFiles(content);
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length < 1) {
    return { status: "error", error: "נדרש להעלות לפחות קובץ אחד" };
  }
  if (files.length > maxFiles) {
    return { status: "error", error: `ניתן להעלות עד ${maxFiles} קבצים` };
  }
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return { status: "error", error: "סוג קובץ לא נתמך — רק תמונות או PDF" };
    if (f.size > MAX_BYTES) return { status: "error", error: "קובץ גדול מדי (מקסימום 10MB)" };
  }

  const uploadResults = await Promise.all(
    files.map(async (f): Promise<UploadedFile | null> => {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${exerciseId}/${user.id}/${randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("exercise-uploads").upload(path, f, {
        contentType: f.type,
        upsert: false,
      });
      if (upErr) return null;
      return { path, name: f.name, mime: f.type, size: f.size };
    }),
  );
  if (uploadResults.some((r) => r === null)) {
    return { status: "error", error: "שגיאה בהעלאת הקובץ — נסה שנית" };
  }
  const uploaded = uploadResults as UploadedFile[];

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };
  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const passed = content.completion_mode === "auto_complete" ? true : null;

  const { error: insErr } = (await supabase.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    attempt_number: nextAttempt,
    answer_data: { files: uploaded },
    passed,
    score_pct: null,
  })) as { error: unknown };
  if (insErr) return { status: "error", error: "שגיאה בשמירת ההגשה — נסה שנית" };

  revalidatePath(`/lessons/${lessonId}`);
  return { status: "success", passed: passed === true };
}
