"use client";

import { useRef, useState } from "react";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";

interface CandleChartProps {
  candles: CandleData[];
  mode?: "view-only" | "student-click" | "admin-draw";

  // Price lines (new array format)
  supportLevels?: PriceLine[];
  resistanceLevels?: PriceLine[];

  // Legacy single-level props (kept for candle_chart_select backwards compat)
  resistanceLevel?: number;
  supportLevel?: number;

  // student-click mode
  selectedPoint?: { price: number; candleIndex: number } | null;
  onPointClick?: (price: number, candleIndex: number) => void;

  // admin-draw mode
  acceptanceZone?: AcceptanceZone | null;
  onZoneDraw?: (zone: AcceptanceZone) => void;

  // Legacy candle_chart_select props
  selectedIndex?: number | null;
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
  mode = "view-only",
  supportLevels = [],
  resistanceLevels = [],
  resistanceLevel,
  supportLevel,
  selectedPoint,
  onPointClick,
  acceptanceZone,
  onZoneDraw,
  selectedIndex,
  correctIndex,
  showSolution = false,
  onCandleClick,
}: CandleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverSVG, setHoverSVG] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const allSupportLevels: PriceLine[] = [
    ...supportLevels,
    ...(supportLevel !== undefined ? [{ price: supportLevel }] : []),
  ];
  const allResistanceLevels: PriceLine[] = [
    ...resistanceLevels,
    ...(resistanceLevel !== undefined ? [{ price: resistanceLevel }] : []),
  ];

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  allSupportLevels.forEach((l) => allPrices.push(l.price));
  allResistanceLevels.forEach((l) => allPrices.push(l.price));

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const priceRange = rawMax - rawMin || 1;
  const paddingAmt = priceRange * 0.06;
  const minPrice = rawMin - paddingAmt;
  const maxPrice = rawMax + paddingAmt;
  const totalRange = maxPrice - minPrice;

  const slotW = chartW / candles.length;
  const bodyW = Math.max(4, slotW * 0.6);

  function scaleY(price: number): number {
    return PAD_Y + chartH - ((price - minPrice) / totalRange) * chartH;
  }

  function svgCoords(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function svgXToCandleIndex(svgX: number): number {
    const relX = svgX - PAD_X;
    return Math.max(0, Math.min(candles.length - 1, Math.floor(relX / slotW)));
  }

  function svgYToPrice(svgY: number): number {
    return maxPrice - ((svgY - PAD_Y) / chartH) * totalRange;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "view-only") return;
    setHoverSVG(svgCoords(e));
    if (mode === "admin-draw" && dragStart) {
      setDragCurrent(svgCoords(e));
    }
  }

  function handleMouseLeave() {
    setHoverSVG(null);
    if (mode === "admin-draw" && dragStart) {
      setDragStart(null);
      setDragCurrent(null);
    }
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== "admin-draw") return;
    e.preventDefault();
    setDragStart(svgCoords(e));
    setDragCurrent(svgCoords(e));
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "student-click" && onPointClick) {
      const { x, y } = svgCoords(e);
      onPointClick(svgYToPrice(y), svgXToCandleIndex(x));
    }

    if (mode === "admin-draw" && dragStart && onZoneDraw) {
      const end = svgCoords(e);
      const zone: AcceptanceZone = {
        start_candle_index: svgXToCandleIndex(Math.min(dragStart.x, end.x)),
        end_candle_index: svgXToCandleIndex(Math.max(dragStart.x, end.x)),
        min_price: svgYToPrice(Math.max(dragStart.y, end.y)),
        max_price: svgYToPrice(Math.min(dragStart.y, end.y)),
      };
      onZoneDraw(zone);
      setDragStart(null);
      setDragCurrent(null);
    }
  }

  const gridPrices = [0.25, 0.5, 0.75].map(
    (f) => minPrice + totalRange * f,
  );

  const zoneToDraw: AcceptanceZone | null = (() => {
    if (dragStart && dragCurrent) {
      return {
        start_candle_index: svgXToCandleIndex(Math.min(dragStart.x, dragCurrent.x)),
        end_candle_index: svgXToCandleIndex(Math.max(dragStart.x, dragCurrent.x)),
        min_price: svgYToPrice(Math.max(dragStart.y, dragCurrent.y)),
        max_price: svgYToPrice(Math.min(dragStart.y, dragCurrent.y)),
      };
    }
    return acceptanceZone ?? null;
  })();

  const cursorStyle =
    mode === "student-click" || mode === "admin-draw" ? "crosshair" : "default";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ height: "auto", cursor: cursorStyle, userSelect: "none" }}
      aria-label="גרף נרות יפניים"
      role={mode !== "view-only" ? "button" : "img"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Grid */}
      {gridPrices.map((price) => {
        const y = scaleY(price);
        return (
          <g key={price}>
            <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
              stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 4" strokeOpacity={0.2} />
            <text x={W - PAD_X - 2} y={y - 3} textAnchor="end"
              fontSize={9} fill="currentColor" fillOpacity={0.45}>
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Resistance lines */}
      {allResistanceLevels.map((line, i) => (
        <g key={`r${i}`}>
          <line x1={PAD_X} y1={scaleY(line.price)} x2={W - PAD_X} y2={scaleY(line.price)}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={PAD_X + 4} y={scaleY(line.price) - 4} textAnchor="start"
            fontSize={9} fill="#ef4444" fillOpacity={0.85}>
            {line.label ?? `התנגדות ${line.price.toFixed(0)}`}
          </text>
        </g>
      ))}

      {/* Support lines */}
      {allSupportLevels.map((line, i) => (
        <g key={`s${i}`}>
          <line x1={PAD_X} y1={scaleY(line.price)} x2={W - PAD_X} y2={scaleY(line.price)}
            stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={PAD_X + 4} y={scaleY(line.price) + 12} textAnchor="start"
            fontSize={9} fill="#22c55e" fillOpacity={0.85}>
            {line.label ?? `תמיכה ${line.price.toFixed(0)}`}
          </text>
        </g>
      ))}

      {/* Acceptance zone overlay */}
      {zoneToDraw && candles.length > 0 && (() => {
        const x1 = PAD_X + zoneToDraw.start_candle_index * slotW;
        const x2 = PAD_X + (zoneToDraw.end_candle_index + 1) * slotW;
        const y1 = scaleY(zoneToDraw.max_price);
        const y2 = scaleY(zoneToDraw.min_price);
        return (
          <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
            fill="#22c55e" fillOpacity={0.15}
            stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" rx={4} />
        );
      })()}

      {/* Candles */}
      {candles.map((candle, i) => {
        const cx = PAD_X + i * slotW + slotW / 2;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";
        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const wickTop = scaleY(candle.high);
        const wickBottom = scaleY(candle.low);

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

      {/* Student-click selected point marker */}
      {selectedPoint && mode === "student-click" && (() => {
        const cx = PAD_X + (selectedPoint.candleIndex + 0.5) * slotW;
        const cy = scaleY(selectedPoint.price);
        return (
          <>
            <line x1={cx} y1={PAD_Y} x2={cx} y2={H - PAD_Y}
              stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
            <line x1={PAD_X} y1={cy} x2={W - PAD_X} y2={cy}
              stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
            <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="white" strokeWidth={1.5} />
            <rect x={W - PAD_X - 52} y={cy - 11} width={50} height={14}
              fill="#f97316" rx={3} />
            <text x={W - PAD_X - 27} y={cy} textAnchor="middle"
              fontSize={9} fill="white">
              &#8362;{selectedPoint.price.toFixed(1)}
            </text>
          </>
        );
      })()}

      {/* Crosshair (hover) */}
      {hoverSVG && mode !== "view-only" && (
        <>
          <line x1={hoverSVG.x} y1={PAD_Y} x2={hoverSVG.x} y2={H - PAD_Y}
            stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />
          <line x1={PAD_X} y1={hoverSVG.y} x2={W - PAD_X} y2={hoverSVG.y}
            stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />
        </>
      )}
    </svg>
  );
}
