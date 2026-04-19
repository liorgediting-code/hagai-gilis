/**
 * Local row types for the course system tables (modules, lessons, lesson_progress,
 * lesson_summaries, user_permissions). These mirror the columns in 0002_courses.sql
 * and will align with the generated database.ts once types are regenerated.
 */

export type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  last_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
};

export type LessonSummaryRow = {
  lesson_id: string;
  body_markdown: string;
  updated_at: string;
};

export type UserPermissionRow = {
  user_id: string;
  page: "lessons" | "exercises" | "summaries";
  created_at: string;
};

export type PageKey = "lessons" | "exercises" | "summaries";

export type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  order_index: number;
  content_json: unknown | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseSubmissionRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  answer_data: unknown | null;
  submitted_at: string;
};
