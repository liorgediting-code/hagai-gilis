import type { CandleData } from "@/lib/types/course-types";

/**
 * Parses a CSV string (date,open,high,low,close) into CandleData[].
 * Skips blank lines and the header row if present.
 * Returns { candles, errors } — errors lists human-readable problems.
 */
export function parseCandleCSV(raw: string): {
  candles: CandleData[];
  errors: string[];
} {
  const errors: string[] = [];
  const candles: CandleData[] = [];

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) {
      // Skip header or malformed rows
      if (line.toLowerCase().includes("date") || line.toLowerCase().includes("open")) continue;
      errors.push(`שורה לא תקינה (${parts.length} עמודות): ${line}`);
      continue;
    }

    const [date, openStr, highStr, lowStr, closeStr] = parts;
    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);

    if ([open, high, low, close].some(isNaN)) {
      errors.push(`ערך מחיר לא מספרי בשורה: ${line}`);
      continue;
    }

    candles.push({ date, open, high, low, close });
  }

  return { candles, errors };
}
