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
 * Of the closed (resolved) flags, the share resolved on or before their act-by date.
 * Open flags are counted once they close, so closed + open always adds up to all flags.
 */
export function flagsResolvedBeforeActBy(
  flags: readonly { actBy: ISODate | null; resolvedOn?: ISODate | null }[],
): { resolvedInTime: number; closed: number; rate: number } {
  let closed = 0;
  let inTime = 0;
  for (const f of flags) {
    if (!f.resolvedOn) continue;
    closed++;
    if (f.actBy == null || f.resolvedOn <= f.actBy) inTime++;
  }
  return { resolvedInTime: inTime, closed, rate: closed > 0 ? inTime / closed : 1 };
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
