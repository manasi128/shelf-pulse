/**
 * Indian number formatting: ₹, lakh/crore grouping (12,34,567).
 * Digits stay Latin in every language (what reps see on invoices and packs);
 * only the words "lakh"/"crore" are translated.
 */
import i18n from './index';
import { DEMO_TODAY } from '../config/demo';

const LOCALE = 'en-IN-u-nu-latn';

const inr = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** ₹12,34,567 */
export function formatINR(value: number): string {
  return inr.format(Math.round(value));
}

/** 12,34,567 */
export function formatNumber(value: number): string {
  return int.format(value);
}

/** ₹12.3 lakh / ₹148 crore, for headline figures. Under 1 lakh shows the full amount. */
export function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${dec1.format(value / 1e7)} ${i18n.t('units.crore')}`;
  if (abs >= 1e5) return `₹${dec1.format(value / 1e5)} ${i18n.t('units.lakh')}`;
  return formatINR(value);
}

/** "5 Nov" (or "17 Oct 2027" outside the current year), month names translated, digits Latin. */
export function formatDate(iso: string, lng = i18n.language): string {
  const [y, m, d] = iso.split('-').map(Number);
  const year = y === Number(DEMO_TODAY.slice(0, 4)) ? undefined : 'numeric';
  return new Intl.DateTimeFormat(`${lng}-IN-u-nu-latn`, { day: 'numeric', month: 'short', year, timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** 0.83 → "83%" */
export function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Whole days, never "Infinity". */
export function formatDays(days: number): string {
  return formatNumber(Math.round(days));
}
