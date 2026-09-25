/**
 * Formats a numeric amount into Indian Currency Format (en-IN).
 * Example: 100000 -> ₹1,00,000
 */
export function formatINR(amount: number, showSymbol = true): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return showSymbol ? '₹0' : '0';
  }

  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats percentage. Example: 8.5 -> 8.5%
 */
export function formatPercent(rate: number): string {
  if (isNaN(rate) || !isFinite(rate)) {
    return '0%';
  }
  return `${rate}%`;
}
