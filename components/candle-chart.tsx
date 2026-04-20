import type { CandleData } from "@/lib/types/course-types";

interface CandleChartProps {
  candles: CandleData[];
  resistanceLevel?: number;
  supportLevel?: number;
  selectedIndex: number | null;
  correctIndex?: number | null;
  showSolution?: boolean;
  onCandleClick?: (index: number) => void;
}

const W = 800;
const H = 380;
const PAD_X = 8;
const PAD_Y = 28;

export function CandleChart({
  candles,
  resistanceLevel,
  supportLevel,
  selectedIndex,
  correctIndex,
  showSolution = false,
  onCandleClick,
}: CandleChartProps) {
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  if (resistanceLevel !== undefined) allPrices.push(resistanceLevel);
  if (supportLevel !== undefined) allPrices.push(supportLevel);

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const priceRange = rawMax - rawMin || 1;
  const padding = priceRange * 0.06;
  const minPrice = rawMin - padding;
  const maxPrice = rawMax + padding;
  const totalRange = maxPrice - minPrice;

  function scaleY(price: number): number {
    return PAD_Y + chartH - ((price - minPrice) / totalRange) * chartH;
  }

  const slotW = chartW / candles.length;
  const bodyW = Math.max(4, slotW * 0.6);

  const gridPrices = [0.25, 0.5, 0.75].map(
    (fraction) => minPrice + totalRange * fraction,
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ height: "auto" }}
      aria-label="גרף נרות יפניים"
      role="img"
    >
      {/* Grid lines */}
      {gridPrices.map((price) => {
        const y = scaleY(price);
        return (
          <g key={price}>
            <line
              x1={PAD_X}
              y1={y}
              x2={W - PAD_X}
              y2={y}
              stroke="currentColor"
              strokeWidth={0.5}
              strokeDasharray="4 4"
              strokeOpacity={0.2}
            />
            <text
              x={W - PAD_X - 2}
              y={y - 3}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.45}
            >
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Resistance line */}
      {resistanceLevel !== undefined && (
        <g>
          <line
            x1={PAD_X}
            y1={scaleY(resistanceLevel)}
            x2={W - PAD_X}
            y2={scaleY(resistanceLevel)}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <text
            x={PAD_X + 4}
            y={scaleY(resistanceLevel) - 4}
            textAnchor="start"
            fontSize={9}
            fill="#ef4444"
            fillOpacity={0.85}
          >
            התנגדות {resistanceLevel.toFixed(0)}
          </text>
        </g>
      )}

      {/* Support line */}
      {supportLevel !== undefined && (
        <g>
          <line
            x1={PAD_X}
            y1={scaleY(supportLevel)}
            x2={W - PAD_X}
            y2={scaleY(supportLevel)}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <text
            x={PAD_X + 4}
            y={scaleY(supportLevel) + 12}
            textAnchor="start"
            fontSize={9}
            fill="#22c55e"
            fillOpacity={0.85}
          >
            תמיכה {supportLevel.toFixed(0)}
          </text>
        </g>
      )}

      {/* Candles */}
      {candles.map((candle, i) => {
        const cx = PAD_X + i * slotW + slotW / 2;
        const isGreen = candle.close >= candle.open;
        const candleColor = isGreen ? "#22c55e" : "#ef4444";

        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const wickTop = scaleY(candle.high);
        const wickBottom = scaleY(candle.low);

        const isSelected = selectedIndex === i;
        const isCorrect = correctIndex === i;

        let highlightColor: string | null = null;
        let highlightOpacity = 0;

        if (showSolution) {
          if (isCorrect) {
            highlightColor = "#22c55e";
            highlightOpacity = 0.15;
          } else if (isSelected && !isCorrect) {
            highlightColor = "#ef4444";
            highlightOpacity = 0.12;
          }
        } else if (isSelected) {
          highlightColor = "#f97316";
          highlightOpacity = 0.15;
        }

        return (
          <g key={i}>
            {/* Background highlight */}
            {highlightColor !== null && (
              <rect
                x={PAD_X + i * slotW}
                y={PAD_Y}
                width={slotW}
                height={chartH}
                fill={highlightColor}
                fillOpacity={highlightOpacity}
              />
            )}

            {/* Wick */}
            <line
              x1={cx}
              y1={wickTop}
              x2={cx}
              y2={wickBottom}
              stroke={candleColor}
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />

            {/* Body */}
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyHeight}
              fill={candleColor}
              fillOpacity={0.8}
            />

            {/* Selected body outline (pre-submission) */}
            {!showSolution && isSelected && (
              <rect
                x={cx - bodyW / 2 - 1}
                y={bodyTop - 1}
                width={bodyW + 2}
                height={bodyHeight + 2}
                fill="none"
                stroke="#f97316"
                strokeWidth={1.5}
              />
            )}

            {/* Invisible click target */}
            {onCandleClick !== undefined && (
              <rect
                x={PAD_X + i * slotW}
                y={PAD_Y}
                width={slotW}
                height={chartH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onCandleClick(i)}
                aria-label={`נר ${i + 1}`}
                role="button"
              />
            )}

            {/* Date label every 5th candle */}
            {i % 5 === 0 && (
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.4}
              >
                {candle.date}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
