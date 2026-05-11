"use client";

import { Button } from "@/components/ui/button";

interface LessonOption {
  id: string;
  title: string;
}

interface Props {
  lessons: LessonOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}

export function WizardStep0Lesson({ lessons, selectedId, onSelect, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 1 — בחר נושא</h2>
        <p className="mt-1 text-sm text-muted-foreground">בחר לאיזה נושא (שיעור) ישויך התרגיל</p>
      </div>

      <div className="space-y-2">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            type="button"
            onClick={() => onSelect(lesson.id)}
            className={`w-full rounded-xl border px-4 py-3 text-start text-sm font-medium transition-colors ${
              selectedId === lesson.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            {lesson.title}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!selectedId} className="min-h-11">
          הבא
        </Button>
      </div>
    </div>
  );
}
