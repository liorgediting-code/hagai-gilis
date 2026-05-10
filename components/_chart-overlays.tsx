"use client";

import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";

interface ChartGridProps {
  minPrice: number;
  totalRange: number;
  H: number;
  W: number;
  PAD_X: number;
  PAD_Y: number;
  chartH: number;
}

export function ChartGrid({ minPrice, totalRange, H, W, PAD_X, PAD_Y, chartH }: ChartGridProps) {
  const gridPrices = [0.25, 0.5, 0.75].map((f) => minPrice + totalRange * f);

  return (
    <>
      {gridPrices.map((price) => {
        const y = PAD_Y + chartH - ((price - minPrice) / totalRange) * chartH;
        return (
          <g key={price}>
            <line
              x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
              stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 4" strokeOpacity={0.2}
            />
            <text
              x={W - PAD_X - 2} y={y - 3} textAnchor="end"
              fontSize={9} fill="currentColor" fillOpacity={0.45}
            >
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}
    </>
  );
}

interface PriceLinesProps {
  levels: PriceLine[];
  color: string;
  defaultLabelPrefix: string;
  labelOffset: number;
  PAD_X: number;
  W: number;
  scaleYFn: (price: number) => number;
}

export function PriceLines({
  levels,
  color,
  defaultLabelPrefix,
  labelOffset,
  PAD_X,
  W,
  scaleYFn,
}: PriceLinesProps) {
  return (
    <>
      {levels.map((line, i) => (
        <g key={i}>
          <line
            x1={PAD_X} y1={scaleYFn(line.price)} x2={W - PAD_X} y2={scaleYFn(line.price)}
            stroke={color} strokeWidth={1.5} strokeDasharray="5 3"
          />
          <text
            x={PAD_X + 4} y={scaleYFn(line.price) + labelOffset} textAnchor="start"
            fontSize={9} fill={color} fillOpacity={0.85}
          >
            {line.label ?? `${defaultLabelPrefix} ${line.price.toFixed(0)}`}
          </text>
        </g>
      ))}
    </>
  );
}

interface AcceptanceZoneOverlayProps {
  zone: AcceptanceZone;
  slotW: number;
  PAD_X: number;
  scaleYFn: (price: number) => number;
}

export function AcceptanceZoneOverlay({ zone, slotW, PAD_X, scaleYFn }: AcceptanceZoneOverlayProps) {
  const x1 = PAD_X + zone.start_candle_index * slotW;
  const x2 = PAD_X + (zone.end_candle_index + 1) * slotW;
  const y1 = scaleYFn(zone.max_price);
  const y2 = scaleYFn(zone.min_price);

  return (
    <rect
      x={x1} y={y1} width={x2 - x1} height={y2 - y1}
      fill="#22c55e" fillOpacity={0.15}
      stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" rx={4}
    />
  );
}

interface SelectedPointMarkerProps {
  point: { price: number; candleIndex: number };
  slotW: number;
  PAD_X: number;
  H: number;
  PAD_Y: number;
  W: number;
  scaleYFn: (price: number) => number;
}

export function SelectedPointMarker({
  point,
  slotW,
  PAD_X,
  H,
  PAD_Y,
  W,
  scaleYFn,
}: SelectedPointMarkerProps) {
  const cx = PAD_X + (point.candleIndex + 0.5) * slotW;
  const cy = scaleYFn(point.price);

  return (
    <>
      <line
        x1={cx} y1={PAD_Y} x2={cx} y2={H - PAD_Y}
        stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7}
      />
      <line
        x1={PAD_X} y1={cy} x2={W - PAD_X} y2={cy}
        stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7}
      />
      <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="white" strokeWidth={1.5} />
      <rect x={W - PAD_X - 52} y={cy - 11} width={50} height={14} fill="#f97316" rx={3} />
      <text x={W - PAD_X - 27} y={cy} textAnchor="middle" fontSize={9} fill="white">
        &#8362;{point.price.toFixed(1)}
      </text>
    </>
  );
}

interface CrosshairProps {
  x: number;
  y: number;
  PAD_X: number;
  W: number;
  PAD_Y: number;
  H: number;
}

export function Crosshair({ x, y, PAD_X, W, PAD_Y, H }: CrosshairProps) {
  return (
    <>
      <line
        x1={x} y1={PAD_Y} x2={x} y2={H - PAD_Y}
        stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5}
      />
      <line
        x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
        stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5}
      />
    </>
  );
}

interface CandleListProps {
  candles: CandleData[];
  slotW: number;
  bodyW: number;
  PAD_X: number;
  PAD_Y: number;
  H: number;
  chartH: number;
  selectedIndex?: number | null;
  correctIndex?: number | null;
  showSolution: boolean;
  onCandleClick?: (index: number) => void;
  scaleYFn: (price: number) => number;
}

export function CandleList({
  candles,
  slotW,
  bodyW,
  PAD_X,
  PAD_Y,
  H,
  chartH,
  selectedIndex,
  correctIndex,
  showSolution,
  onCandleClick,
  scaleYFn,
}: CandleListProps) {
  return (
    <>
      {candles.map((candle, i) => {
        const cx = PAD_X + i * slotW + slotW / 2;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";
        const bodyTop = scaleYFn(Math.max(candle.open, candle.close));
        const bodyBottom = scaleYFn(Math.min(candle.open, candle.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const wickTop = scaleYFn(candle.high);
        const wickBottom = scaleYFn(candle.low);

        const isSelected = selectedIndex === i;
        const isCorrect = correctIndex === i;
        let legacyBg: string | null = null;
        if (showSolution) {
          if (isCorrect) legacyBg = "#22c55e";
          else if (isSelected) legacyBg = "#ef4444";
        } else if (isSelected) {
          legacyBg = "#f97316";
        }

        return (
          <g key={i}>
            {legacyBg && (
              <rect x={PAD_X + i * slotW} y={PAD_Y} width={slotW} height={chartH}
                fill={legacyBg} fillOpacity={0.15} />
            )}
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBottom}
              stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={color} fillOpacity={0.8} />
            {!showSolution && isSelected && (
              <rect x={cx - bodyW / 2 - 1} y={bodyTop - 1} width={bodyW + 2} height={bodyH + 2}
                fill="none" stroke="#f97316" strokeWidth={1.5} />
            )}
            {onCandleClick && (
              <rect x={PAD_X + i * slotW} y={PAD_Y} width={slotW} height={chartH}
                fill="transparent" style={{ cursor: "pointer" }}
                onClick={() => onCandleClick(i)} aria-label={`נר ${i + 1}`} role="button" />
            )}
            {i % 5 === 0 && (
              <text x={cx} y={H - 6} textAnchor="middle"
                fontSize={9} fill="currentColor" fillOpacity={0.4}>
                {candle.date}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
