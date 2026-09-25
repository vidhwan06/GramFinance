/**
 * Rounds a floating point paise or rupee value to the nearest integer using Standard Half-Up Rounding.
 */
export function roundToNearestPaise(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(val);
}

/**
 * Rounds a floating point percentage or rate to 4 decimal places.
 */
export function roundRate(rate: number): number {
  if (isNaN(rate) || !isFinite(rate)) return 0;
  return Math.round(rate * 10000) / 10000;
}
