"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { parseCandleCSV } from "@/lib/utils/parse-candle-csv";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine } from "@/lib/types/exercise-types";

interface Props {
  csvRaw: string;
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  timeframe: string;
  onUpdate: (data: {
    csvRaw: string;
    candles: CandleData[];
    supportLevels: PriceLine[];
    resistanceLevels: PriceLine[];
    timeframe: string;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep2Data({
  csvRaw, candles, supportLevels, resistanceLevels, timeframe, onUpdate, onNext, onBack,
}: Props) {
  const [csv, setCsv] = useState(csvRaw);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [supports, setSupports] = useState<PriceLine[]>(supportLevels);
  const [resistances, setResistances] = useState<PriceLine[]>(resistanceLevels);
  const [localCandleCount, setLocalCandleCount] = useState(candles.length);
  const [localTimeframe, setLocalTimeframe] = useState(timeframe);

  function handleCsvChange(raw: string) {
    setCsv(raw);
    const { candles: parsed, errors } = parseCandleCSV(raw);
    setParseErrors(errors);
    setLocalCandleCount(parsed.length);
    onUpdate({ csvRaw: raw, candles: parsed, supportLevels: supports, resistanceLevels: resistances, timeframe: localTimeframe });
  }

  function handleTimeframeChange(val: string) {
    setLocalTimeframe(val);
    onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: resistances, timeframe: val });
  }

  function addLine(type: "support" | "resistance") {
    const line: PriceLine = { price: 0, label: "" };
    if (type === "support") {
      const next = [...supports, line];
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances, timeframe: localTimeframe });
    } else {
      const next = [...resistances, line];
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next, timeframe: localTimeframe });
    }
  }

  function updateLine(type: "support" | "resistance", index: number, field: keyof PriceLine, value: string) {
    const update = (lines: PriceLine[]) =>
      lines.map((l, i) =>
        i === index ? { ...l, [field]: field === "price" ? parseFloat(value) || 0 : value } : l
      );
    if (type === "support") {
      const next = update(supports);
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances, timeframe: localTimeframe });
    } else {
      const next = update(resistances);
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next, timeframe: localTimeframe });
    }
  }

  function removeLine(type: "support" | "resistance", index: number) {
    if (type === "support") {
      const next = supports.filter((_, i) => i !== index);
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances, timeframe: localTimeframe });
    } else {
      const next = resistances.filter((_, i) => i !== index);
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next, timeframe: localTimeframe });
    }
  }

  const canProceed = localCandleCount >= 3 && parseErrors.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 2 — נתוני גרף</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הדבק נתוני נרות בפורמט CSV: תאריך,פתיחה,גבוה,נמוך,סגירה
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">טיים פריים</label>
        <select
          value={localTimeframe}
          onChange={(e) => handleTimeframeChange(e.target.value)}
          className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          dir="ltr"
        >
          <option value="">ללא</option>
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="30m">30m</option>
          <option value="1H">1H</option>
          <option value="4H">4H</option>
          <option value="1D">1D</option>
          <option value="1W">1W</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">נתוני CSV</label>
        <textarea
          className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          dir="ltr"
          placeholder={"2024-03-01,140,148,138,145\n2024-03-02,145,152,143,150"}
          value={csv}
          onChange={(e) => handleCsvChange(e.target.value)}
        />
        {parseErrors.length > 0 && (
          <ul className="text-xs text-destructive space-y-1">
            {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {candles.length > 0 && parseErrors.length === 0 && (
          <p className="text-xs text-green-500">✓ {candles.length} נרות נטענו</p>
        )}
      </div>

      {candles.length > 0 && (
        <Card className="p-3">
          <CardContent className="px-0">
            <CandleChart
              candles={candles}
              mode="view-only"
              supportLevels={supports}
              resistanceLevels={resistances}
              timeframe={localTimeframe || undefined}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">קווי תמיכה והתנגדות</h3>

        {resistances.map((line, i) => (
          <div key={`r${i}`} className="flex gap-2 items-center">
            <span className="text-xs text-red-400 w-16">התנגדות</span>
            <input type="number" placeholder="מחיר" value={line.price || ""}
              onChange={(e) => updateLine("resistance", i, "price", e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" dir="ltr" />
            <input type="text" placeholder="תווית (אופציונלי)" value={line.label ?? ""}
              onChange={(e) => updateLine("resistance", i, "label", e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
            <button onClick={() => removeLine("resistance", i)}
              className="text-muted-foreground hover:text-destructive text-sm">✕</button>
          </div>
        ))}

        {supports.map((line, i) => (
          <div key={`s${i}`} className="flex gap-2 items-center">
            <span className="text-xs text-green-400 w-16">תמיכה</span>
            <input type="number" placeholder="מחיר" value={line.price || ""}
              onChange={(e) => updateLine("support", i, "price", e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" dir="ltr" />
            <input type="text" placeholder="תווית (אופציונלי)" value={line.label ?? ""}
              onChange={(e) => updateLine("support", i, "label", e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
            <button onClick={() => removeLine("support", i)}
              className="text-muted-foreground hover:text-destructive text-sm">✕</button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addLine("resistance")}>
            + התנגדות
          </Button>
          <Button variant="outline" size="sm" onClick={() => addLine("support")}>
            + תמיכה
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 3</Button>
      </div>
    </div>
  );
}
