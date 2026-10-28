import { daysBetween } from './dates';
import type { ISODate } from './types';

/** Days of cover = stock ÷ forecast rate. No sales with stock on hand → Infinity. */
export function daysOfCover(stock: number, ratePerDay: number): number {
  if (stock <= 0) return 0;
  if (ratePerDay <= 0) return Infinity;
  return stock / ratePerDay;
}

/** Days of life left = expiry − today. */
export function daysOfLifeLeft(expiry: ISODate, today: ISODate): number {
  return daysBetween(today, expiry);
}

/** The ratio behind the act-by date: days to sell ÷ days of life. Shown only as the "why". */
export function stockRiskRatio(cover: number, lifeLeft: number): number {
  if (lifeLeft <= 0) return Infinity;
  return cover / lifeLeft;
}
