"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  selected: "chart_click" | "multiple_choice" | null;
  level: 1 | 2 | 3;
  onSelect: (type: "chart_click" | "multiple_choice") => void;
  onLevelChange: (level: 1 | 2 | 3) => void;
  onNext: () => void;
}

export function WizardStep1Type({ selected, level, onSelect, onLevelChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 1 — סוג תרגיל</h2>
        <p className="mt-1 text-sm text-muted-foreground">בחר את סוג התרגיל ורמת הקושי</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`cursor-pointer transition-colors ${selected === "chart_click" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("chart_click")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">📍</div>
            <h3 className="font-semibold">לחיצה על גרף</h3>
            <p className="text-sm text-muted-foreground">
              הסטודנט לוחץ על נקודה בגרף. האדמין מגדיר אזור קבלה.
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${selected === "multiple_choice" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("multiple_choice")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">🔤</div>
            <h3 className="font-semibold">שאלון (מבחן)</h3>
            <p className="text-sm text-muted-foreground">
              מספר שאלות אמריקאיות על גרף משותף. מוערך לפי % נכון.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">רמת קושי</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLevelChange(l)}
              className={`min-h-11 min-w-11 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                level === l
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              רמה {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
        <Button onClick={onNext} disabled={!selected} className="min-h-11">
          המשך לשלב 2
        </Button>
      </div>
    </div>
  );
}
