/** Maps a price value to an SVG Y coordinate. */
export function scaleY(
  price: number,
  minPrice: number,
  totalRange: number,
  H: number,
  PAD_Y: number,
  chartH: number,
): number {
  return PAD_Y + chartH - ((price - minPrice) / totalRange) * chartH;
}

/** Inverse of scaleY — maps an SVG Y coordinate back to a price value. */
export function svgYToPrice(
  svgY: number,
  maxPrice: number,
  totalRange: number,
  PAD_Y: number,
  chartH: number,
): number {
  return maxPrice - ((svgY - PAD_Y) / chartH) * totalRange;
}

/** Maps an SVG X coordinate to the nearest candle index. */
export function svgXToCandleIndex(
  svgX: number,
  PAD_X: number,
  slotW: number,
  candleCount: number,
): number {
  const relX = svgX - PAD_X;
  return Math.max(0, Math.min(candleCount - 1, Math.floor(relX / slotW)));
}
