"use client";

import { useRef, useState } from "react";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";
import {
  scaleY as scaleYUtil,
  svgYToPrice as svgYToPriceUtil,
  svgXToCandleIndex as svgXToCandleIndexUtil,
  computePriceRange,
} from "@/lib/utils/chart-coordinate-utils";
import {
  ChartGrid,
  PriceLines,
  AcceptanceZoneOverlay,
  SelectedPointMarker,
  Crosshair,
  CandleList,
} from "./_chart-overlays";

interface CandleChartProps {
  candles: CandleData[];
  mode?: "view-only" | "student-click" | "admin-draw";
  supportLevels?: PriceLine[];
  resistanceLevels?: PriceLine[];
  /** Legacy single-level props kept for candle_chart_select backwards compat */
  resistanceLevel?: number;
  supportLevel?: number;
  selectedPoint?: { price: number; candleIndex: number } | null;
  onPointClick?: (price: number, candleIndex: number) => void;
  acceptanceZone?: AcceptanceZone | null;
  onZoneDraw?: (zone: AcceptanceZone) => void;
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

  const allSupportLevels: PriceLine[] = supportLevel !== undefined
    ? [...supportLevels, { price: supportLevel }] : supportLevels;
  const allResistanceLevels: PriceLine[] = resistanceLevel !== undefined
    ? [...resistanceLevels, { price: resistanceLevel }] : resistanceLevels;

  const allPrices = [
    ...candles.flatMap((c) => [c.high, c.low]),
    ...allSupportLevels.map((l) => l.price),
    ...allResistanceLevels.map((l) => l.price),
  ];
  const { minPrice, maxPrice, totalRange } = computePriceRange(allPrices);
  const slotW = chartW / candles.length;
  const bodyW = Math.max(4, slotW * 0.6);

  const scaleY = (price: number) => scaleYUtil(price, minPrice, totalRange, H, PAD_Y, chartH);
  const svgYToPrice = (svgY: number) => svgYToPriceUtil(svgY, maxPrice, totalRange, PAD_Y, chartH);
  const svgXToCandleIndex = (svgX: number) => svgXToCandleIndexUtil(svgX, PAD_X, slotW, candles.length);
  function svgCoords(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
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

  const zoneToDraw: AcceptanceZone | null = (dragStart && dragCurrent)
    ? {
        start_candle_index: svgXToCandleIndex(Math.min(dragStart.x, dragCurrent.x)),
        end_candle_index: svgXToCandleIndex(Math.max(dragStart.x, dragCurrent.x)),
        min_price: svgYToPrice(Math.max(dragStart.y, dragCurrent.y)),
        max_price: svgYToPrice(Math.min(dragStart.y, dragCurrent.y)),
      }
    : (acceptanceZone ?? null);
  const cursorStyle = mode === "student-click" || mode === "admin-draw" ? "crosshair" : "default";

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
      <ChartGrid
        minPrice={minPrice} totalRange={totalRange}
        H={H} W={W} PAD_X={PAD_X} PAD_Y={PAD_Y} chartH={chartH}
      />

      <PriceLines
        levels={allResistanceLevels} color="#ef4444"
        defaultLabelPrefix="התנגדות" labelOffset={-4}
        PAD_X={PAD_X} W={W} scaleYFn={scaleY}
      />

      <PriceLines
        levels={allSupportLevels} color="#22c55e"
        defaultLabelPrefix="תמיכה" labelOffset={12}
        PAD_X={PAD_X} W={W} scaleYFn={scaleY}
      />

      {zoneToDraw && candles.length > 0 && (
        <AcceptanceZoneOverlay zone={zoneToDraw} slotW={slotW} PAD_X={PAD_X} scaleYFn={scaleY} />
      )}

      <CandleList
        candles={candles} slotW={slotW} bodyW={bodyW}
        PAD_X={PAD_X} PAD_Y={PAD_Y} H={H} chartH={chartH}
        selectedIndex={selectedIndex} correctIndex={correctIndex}
        showSolution={showSolution} onCandleClick={onCandleClick}
        scaleYFn={scaleY}
      />

      {selectedPoint && mode === "student-click" && (
        <SelectedPointMarker
          point={selectedPoint} slotW={slotW}
          PAD_X={PAD_X} H={H} PAD_Y={PAD_Y} W={W} scaleYFn={scaleY}
        />
      )}

      {hoverSVG && mode !== "view-only" && (
        <Crosshair
          x={hoverSVG.x} y={hoverSVG.y}
          PAD_X={PAD_X} W={W} PAD_Y={PAD_Y} H={H}
        />
      )}
    </svg>
  );
}
