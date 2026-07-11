// Shared display formatting. No game logic — pure presentation.

// Render a valuation (in $B) as a compact human string.
export function fmtValuation(b: number): string {
  if (b >= 1000) return `$${(b / 1000).toFixed(2)}T`;
  if (b >= 1) return `$${b.toFixed(1)}B`;
  if (b > 0) return `$${Math.round(b * 1000)}M`;
  return "$0";
}
