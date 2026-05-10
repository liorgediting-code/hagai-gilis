"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  selected: "chart_click" | "multiple_choice" | null;
  onSelect: (type: "chart_click" | "multiple_choice") => void;
  onNext: () => void;
}

export function WizardStep1Type({ selected, onSelect, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 1 — סוג תרגיל</h2>
        <p className="mt-1 text-sm text-muted-foreground">בחר את סוג התרגיל שברצונך ליצור</p>
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
              הסטודנט לוחץ על נקודה בגרף. האדמין מגדיר אזור קבלה. מתאים לסימון פריצות, נקודות כניסה, ואזורי מחיר.
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${selected === "multiple_choice" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("multiple_choice")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">🔤</div>
            <h3 className="font-semibold">שאלה אמריקאית</h3>
            <p className="text-sm text-muted-foreground">
              4 אפשרויות טקסט, הסטודנט בוחר אחת. הגרף מוצג לצד השאלה כהקשר.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button onClick={onNext} disabled={!selected} className="min-h-11">
          המשך לשלב 2
        </Button>
      </div>
    </div>
  );
}
