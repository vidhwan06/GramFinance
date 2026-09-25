import { roundToNearestPaise } from './rounding';

/**
 * Converts a floating point INR rupee value to integer paise.
 * Example: 1000.50 -> 100050
 */
export function toPaise(rupees: number): number {
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return roundToNearestPaise(rupees * 100);
}

/**
 * Converts integer paise to INR rupee decimal value.
 * Example: 100050 -> 1000.50
 */
export function toRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return paise / 100;
}

/**
 * Formats integer paise into Indian Currency string format.
 * Example: 100050 -> ₹1,000.50 or ₹1,001 (if rounded)
 */
export function formatPaiseINR(paise: number, showDecimals = false): string {
  const rupees = toRupees(paise);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(showDecimals ? rupees : Math.round(rupees));

  return `₹${formatted}`;
}
