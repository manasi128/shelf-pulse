import type { ISODate, Status } from './types';

/** Returns + expiry as a share of sales value. */
export function returnExpiryRate(returnsValue: number, salesValue: number): number {
  return salesValue > 0 ? returnsValue / salesValue : 0;
}

/** Value of stock currently amber or red. */
export function atRiskValue(lines: readonly { status: Status; stockValue: number }[]): number {
  return lines.filter((l) => l.status !== 'green').reduce((s, l) => s + l.stockValue, 0);
}

/**
 * Of the flags that are settled (resolved) or whose act-by has passed,
 * the share resolved on or before their act-by date.
 */
export function flagsResolvedBeforeActBy(
  flags: readonly { actBy: ISODate | null; resolvedOn?: ISODate | null }[],
  today: ISODate,
): { resolvedInTime: number; due: number; rate: number } {
  let due = 0;
  let inTime = 0;
  for (const f of flags) {
    const passed = f.actBy != null && f.actBy < today;
    if (!f.resolvedOn && !passed) continue;
    due++;
    if (f.resolvedOn && (f.actBy == null || f.resolvedOn <= f.actBy)) inTime++;
  }
  return { resolvedInTime: inTime, due, rate: due > 0 ? inTime / due : 1 };
}

/** Guardrail: share of must-sell outlet×SKU lines with stock on the shelf. */
export function mustSellAvailability(lines: readonly { mustSell: boolean; stock: number }[]): number {
  const must = lines.filter((l) => l.mustSell);
  return must.length ? must.filter((l) => l.stock > 0).length / must.length : 1;
}

/** Loading index = primary (sell-in) growth − secondary (sell-out) growth, in percentage points. Positive = loading the channel. */
export function loadingIndex(primaryGrowthPct: number, secondaryGrowthPct: number): number {
  return primaryGrowthPct - secondaryGrowthPct;
}
