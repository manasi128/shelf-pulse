import { daysBetween } from './dates';
import type { VisitCount } from './types';

export interface SalesResult {
  /** Units sold in the shop between the two visits (never negative). */
  units: number;
  /** True when the count is higher than last count + deliveries: the numbers don't add up. */
  needsRecount: boolean;
}

/**
 * Shop sales since last visit = stock at last visit + delivered since − stock today.
 * Deliveries come from distributor billing; the rep only counts.
 */
export function salesSinceLastVisit(stockLastVisit: number, deliveredSince: number, stockToday: number): SalesResult {
  const raw = stockLastVisit + deliveredSince - stockToday;
  return raw < 0 ? { units: 0, needsRecount: true } : { units: raw, needsRecount: false };
}

/**
 * Sales rate (units/day) for each visit interval, NEWEST FIRST.
 * `visits` is oldest → newest, the last entry being today's count.
 */
export function ratesNewestFirst(visits: readonly VisitCount[]): number[] {
  const rates: number[] = [];
  for (let i = visits.length - 1; i >= 1; i--) {
    const prev = visits[i - 1];
    const cur = visits[i];
    const days = daysBetween(prev.date, cur.date);
    if (days <= 0) continue;
    const { units } = salesSinceLastVisit(prev.stock, cur.deliveredSincePrev, cur.stock);
    rates.push(units / days);
  }
  return rates;
}

/** Units sold in each visit interval, NEWEST FIRST (for "demand over the last 3 visits"). */
export function salesNewestFirst(visits: readonly VisitCount[]): number[] {
  const out: number[] = [];
  for (let i = visits.length - 1; i >= 1; i--) {
    out.push(salesSinceLastVisit(visits[i - 1].stock, visits[i].deliveredSincePrev, visits[i].stock).units);
  }
  return out;
}
