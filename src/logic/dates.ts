import type { ISODate } from './types';

const DAY_MS = 86_400_000;

function toUTC(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from a to b (positive if b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return new Date(toUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
