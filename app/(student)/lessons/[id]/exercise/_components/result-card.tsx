"use client";

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { WhatsAppCard } from "./whatsapp-card";

interface QuestionResult {
  correct: boolean;
  explanation: string;
  correct_option_index: 0 | 1 | 2 | 3;
}

interface Props {
  passed: boolean;
  scorePct: number;
  passThreshold: number;
  level: 1 | 2 | 3;
  lessonId: string;
  nextLessonId: string | null;
  explanation?: string;
  questionResults?: QuestionResult[];
}

function getLevelMessage(passed: boolean, level: 1 | 2 | 3): string {
  if (level === 1) {
    return passed ? "כל הכבוד! עברת לרמה הגבוהה" : "לא עברת. חזור לשיעור ונסה שנית";
  }
  if (level === 2) {
    return passed ? "עברת! ממשיכים לרמה הגבוהה" : "";
  }
  return passed ? "מצוין! השיעור הבא נפתח עבורך" : "לא עברת. נסה שוב";
}

interface ActionConfig {
  label: string;
  href: string;
}

function getLevelAction(
  passed: boolean,
  level: 1 | 2 | 3,
  lessonId: string,
  nextLessonId: string | null,
): ActionConfig | null {
  if (level === 1) {
    return passed
      ? { label: "המשך לרמה 3", href: `/lessons/${lessonId}/exercise` }
      : { label: "חזרה לשיעור", href: `/lessons/${lessonId}?retry=true` };
  }
  if (level === 2) {
    return passed
      ? { label: "המשך לרמה 3", href: `/lessons/${lessonId}/exercise` }
      : null;
  }
  if (passed) {
    return nextLessonId
      ? { label: "המשך לשיעור הבא", href: `/lessons/${nextLessonId}` }
      : { label: "לכל השיעורים", href: "/lessons" };
  }
  return { label: "נסה שוב", href: `/lessons/${lessonId}/exercise` };
}

export function ResultCard({ passed, scorePct, passThreshold, level, lessonId, nextLessonId, explanation, questionResults }: Props) {
  const message = getLevelMessage(passed, level);
  const action = getLevelAction(passed, level, lessonId, nextLessonId);
  const showWhatsApp = level === 2 && !passed;

  return (
    <div className="rounded-xl border p-6 space-y-4 mt-6">
      <div className="flex items-center justify-center gap-2">
        {passed
          ? <CheckCircle2 className="size-6 text-green-600" aria-hidden="true" />
          : <XCircle className="size-6 text-red-600" aria-hidden="true" />
        }
        {message && (
          <p className={`font-bold text-lg ${passed ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>

      {scorePct < 100 && (
        <p className="text-sm text-muted-foreground text-center">
          ציון: {scorePct}% (נדרש {passThreshold}%)
        </p>
      )}

      {questionResults && questionResults.length > 0 && (
        <div className="space-y-2">
          {questionResults.map((qr, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-sm ${qr.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
            >
              <p className="font-medium">{qr.correct ? "✓ נכון" : "✗ שגוי"}</p>
              {!qr.correct && (
                <p className="text-muted-foreground mt-1">{qr.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {explanation && (
        <p className="text-sm text-muted-foreground text-center">{explanation}</p>
      )}

      {showWhatsApp ? (
        <WhatsAppCard />
      ) : action ? (
        <div className="flex justify-center">
          <Link
            href={action.href}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground text-sm font-medium min-h-11"
          >
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
