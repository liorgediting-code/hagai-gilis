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

/** Computes padded min/max/totalRange from raw price arrays. */
export function computePriceRange(prices: number[]): {
  minPrice: number;
  maxPrice: number;
  totalRange: number;
} {
  if (prices.length === 0) return { minPrice: 0, maxPrice: 100, totalRange: 100 };
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const priceRange = rawMax - rawMin || 1;
  const paddingAmt = priceRange * 0.06;
  const minPrice = rawMin - paddingAmt;
  const maxPrice = rawMax + paddingAmt;
  return { minPrice, maxPrice, totalRange: maxPrice - minPrice };
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
