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
  pass_threshold: number;
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
  page: "lessons" | "exercises" | "summaries" | "market" | "market_deny";
  created_at: string;
};

export type PageKey = "lessons" | "exercises" | "summaries" | "market" | "market_deny";

export type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  order_index: number;
  level: number;
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
  passed: boolean | null;
  score_pct: number | null;
  submitted_at: string;
};

export type LessonUnlockRow = {
  user_id: string;
  lesson_id: string;
  unlocked_at: string;
  unlocked_by: string | null;
};

export type MarketPostRow = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  author_id: string | null;
  created_at: string;
};

export type CandleData = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandleChartExercise = {
  type: "candle_chart_select";
  question: string;
  candles: CandleData[];
  resistance_level?: number;
  support_level?: number;
  correct_candle_index: number;
  explanation: string;
};
