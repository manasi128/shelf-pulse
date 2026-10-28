import { THRESHOLDS } from '../config/thresholds';
import type { Status } from './types';

export interface OrderLineInput {
  skuId: string;
  status: Status;
  forecastRate: number;
  stock: number;
  unitPrice: number;
  mustSell: boolean;
  /** What the retailer ordered last time (the "usual" order), in units. */
  usualQty: number;
}

export type OrderReason = 'replenish' | 'fast_topup' | 'held_amber' | 'held_red' | 'range_gap';

export interface OrderLine {
  skuId: string;
  qty: number;
  value: number;
  reason: OrderReason;
}

export interface SuggestedOrder {
  lines: OrderLine[];
  suggestedValue: number;
  usualValue: number;
  /** suggestedValue ÷ usualValue (1 = full order value kept). */
  valueKeptRatio: number;
  /** Units of amber/red stock added. Always 0 by design; computed to prove it. */
  slowStockAdded: number;
}

export function isFastSeller(line: Pick<OrderLineInput, 'forecastRate' | 'mustSell'>, cfg = THRESHOLDS.order): boolean {
  return line.mustSell || line.forecastRate >= cfg.fastSellerMinRatePerDay;
}

/**
 * Green SKUs: expected sales to next visit × 1.25 − stock.
 * Fast sellers: topped up to at most 2 visits of demand.
 * Amber/red: held (0). Range gaps the retailer asked for: a starter quantity.
 */
export function suggestOrder(
  args: {
    lines: readonly OrderLineInput[];
    daysToNextVisit: number;
    rangeGaps?: readonly { skuId: string; unitPrice: number }[];
  },
  cfg = THRESHOLDS.order,
): SuggestedOrder {
  const out: OrderLine[] = args.lines.map((l) => {
    if (l.status !== 'green') {
      return { skuId: l.skuId, qty: 0, value: 0, reason: l.status === 'red' ? 'held_red' : 'held_amber' };
    }
    const expected = l.forecastRate * args.daysToNextVisit;
    const fast = isFastSeller(l, cfg);
    const qty = fast
      ? Math.max(0, Math.floor(expected * cfg.fastSellerMaxVisitsOfDemand - l.stock))
      : Math.max(0, Math.ceil(expected * cfg.safetyFactor - l.stock));
    return { skuId: l.skuId, qty, value: qty * l.unitPrice, reason: fast ? 'fast_topup' : 'replenish' };
  });

  for (const gap of args.rangeGaps ?? []) {
    const qty = cfg.rangeGapStarterUnits;
    out.push({ skuId: gap.skuId, qty, value: qty * gap.unitPrice, reason: 'range_gap' });
  }

  const suggestedValue = out.reduce((s, l) => s + l.value, 0);
  const usualValue = args.lines.reduce((s, l) => s + l.usualQty * l.unitPrice, 0);
  const slowStockAdded = out
    .filter((l) => l.reason === 'held_amber' || l.reason === 'held_red')
    .reduce((s, l) => s + l.qty, 0);

  return {
    lines: out,
    suggestedValue,
    usualValue,
    valueKeptRatio: usualValue > 0 ? suggestedValue / usualValue : 1,
    slowStockAdded,
  };
}
