import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../config/thresholds';
import {
  actByNudge,
  atRiskValue,
  flagsResolvedBeforeActBy,
  loadingIndex,
  mustSellAvailability,
  notReordered,
  rankBeat,
  returnExpiryRate,
  seedLaunchOutlets,
  suggestOrder,
  sustainabilityTally,
  type OrderLineInput,
} from './index';

describe('suggested order', () => {
  const lines: OrderLineInput[] = [
    { skuId: 'FACEWASH', status: 'green', forecastRate: 3, stock: 10, unitPrice: 150, mustSell: true, usualQty: 20 },
    { skuId: 'SHAMPOO', status: 'green', forecastRate: 0.5, stock: 2, unitPrice: 200, mustSell: false, usualQty: 4 },
    { skuId: 'LIPSTICK', status: 'amber', forecastRate: 0.1, stock: 9, unitPrice: 499, mustSell: false, usualQty: 6 },
    { skuId: 'SUNSCREEN', status: 'red', forecastRate: 0.2, stock: 12, unitPrice: 450, mustSell: false, usualQty: 6 },
  ];
  const order = suggestOrder({ lines, daysToNextVisit: 7, rangeGaps: [{ skuId: 'KAJAL', unitPrice: 199 }] });
  const qty = (id: string) => order.lines.find((l) => l.skuId === id)?.qty;

  it('green = expected sales to next visit × 1.25 − stock', () => {
    expect(qty('SHAMPOO')).toBe(3); // 3.5 × 1.25 − 2 = 2.375 → 3
  });
  it('tops fast sellers up to at most 2 visits of demand', () => {
    expect(qty('FACEWASH')).toBe(32); // 2 × 21 − 10
  });
  it('holds amber and red: slow stock added is 0', () => {
    expect(qty('LIPSTICK')).toBe(0);
    expect(qty('SUNSCREEN')).toBe(0);
    expect(order.slowStockAdded).toBe(0);
  });
  it('suggests range gaps the retailer asked for', () => {
    expect(order.lines.find((l) => l.reason === 'range_gap')).toMatchObject({ skuId: 'KAJAL', qty: 3 });
  });
  it('reports order value kept against the usual order', () => {
    expect(order.usualValue).toBe(20 * 150 + 4 * 200 + 6 * 499 + 6 * 450);
    expect(order.suggestedValue).toBe(32 * 150 + 3 * 200 + 3 * 199);
    expect(order.valueKeptRatio).toBeCloseTo(order.suggestedValue / order.usualValue);
  });
  it('never orders a negative quantity', () => {
    const o = suggestOrder({ lines: [{ ...lines[1], stock: 100 }], daysToNextVisit: 7 });
    expect(o.lines[0].qty).toBe(0);
  });
});

describe('beat ranking and nudges', () => {
  const outlets = [
    { outletId: 'calm', openFlags: 0, lines: [{ status: 'green' as const, stockValue: 9000, daysToActBy: 120 }] },
    {
      outletId: 'sharma',
      openFlags: 2,
      lines: [
        { status: 'red' as const, stockValue: 5400, daysToActBy: 4 },
        { status: 'amber' as const, stockValue: 3000, daysToActBy: 45 },
      ],
    },
    { outletId: 'slow', openFlags: 0, lines: [{ status: 'amber' as const, stockValue: 4000, daysToActBy: 50 }] },
    { outletId: 'calm2', openFlags: 0, lines: [] },
  ];
  it('puts the riskiest outlet first and says why', () => {
    const r = rankBeat(outlets);
    expect(r.map((o) => o.outletId)).toEqual(['sharma', 'slow', 'calm', 'calm2']);
    expect(r[0].reasons[0]).toEqual({ code: 'red_lines', count: 1 });
    expect(r[0].reasons).toContainEqual({ code: 'act_by_soon', days: 4 });
    expect(r[0].reasons).toContainEqual({ code: 'open_flags', count: 2 });
  });
  it('counts batches reaching act-by this week', () => {
    expect(actByNudge([3, 7, 8, -2, null, 0])).toEqual({ thisWeek: 3, overdue: 1 });
  });
});

describe('pre-visit brief', () => {
  it('lists SKUs not reordered for 2+ cycles', () => {
    expect(
      notReordered([
        { skuId: 'A', orderedQtyByVisit: [0, 0, 5] },
        { skuId: 'B', orderedQtyByVisit: [0, 3] },
        { skuId: 'C', orderedQtyByVisit: [0] },
      ]),
    ).toEqual(['A']);
  });
  it('seeds launches to outlets with proven demand, fastest first', () => {
    expect(
      seedLaunchOutlets([
        { outletId: 'x', categoryRatePerDay: 2, recentVisitSales: [1, 0, 2] },
        { outletId: 'y', categoryRatePerDay: 1, recentVisitSales: [1, 1, 1] },
        { outletId: 'z', categoryRatePerDay: 3, recentVisitSales: [2, 2, 2] },
      ]),
    ).toEqual(['z', 'y']);
  });
});

describe('sustainability tally', () => {
  const resolutions = [
    { route: 'transfer' as const, units: 10, unitPrice: 499, packagingGrams: 30 },
    { route: 'salon_backbar' as const, units: 5, unitPrice: 1200, packagingGrams: 120 },
    { route: 'epr_recycling' as const, units: 4, unitPrice: 300 },
  ];
  it('tallies units kept, ₹ saved, packaging kg and reverse trips by route', () => {
    const t = sustainabilityTally(resolutions);
    expect(t.unitsKeptFromDestruction).toBe(15);
    expect(t.rupeesSaved).toBeCloseTo(4990 + 5 * 1200 * 0.6);
    expect(t.packagingKg).toBeCloseTo(0.3 + 0.6 + (4 * THRESHOLDS.sustainability.defaultPackagingGrams) / 1000);
    expect(t.reverseTripsAvoided).toBe(2);
  });
  it('counts one return pickup per shop per day, not per unit or per line', () => {
    const t = sustainabilityTally([
      { route: 'transfer', units: 8, unitPrice: 399, outletId: 'a', date: '2026-11-02' },
      { route: 'salon_backbar', units: 3, unitPrice: 1150, outletId: 'a', date: '2026-11-02' },
      { route: 'donation', units: 5, unitPrice: 399, outletId: 'b', date: '2026-11-02' },
      { route: 'epr_recycling', units: 2, unitPrice: 1150, outletId: 'c', date: '2026-11-02' },
    ]);
    expect(t.reverseTripsAvoided).toBe(2);
  });
  it('shows no CO₂ unless emission factors are provided', () => {
    expect(sustainabilityTally(resolutions).co2Kg).toBeNull();
    const withFactor = { ...THRESHOLDS, sustainability: { ...THRESHOLDS.sustainability, co2KgPerReverseTrip: 2.5 } };
    expect(sustainabilityTally(resolutions, withFactor).co2Kg).toBe(5);
  });
});

describe('manager KPIs', () => {
  it('return and expiry rate, at-risk value, must-sell availability, loading index', () => {
    expect(returnExpiryRate(25, 1000)).toBe(0.025);
    expect(
      atRiskValue([
        { status: 'green', stockValue: 100 },
        { status: 'amber', stockValue: 200 },
        { status: 'red', stockValue: 300 },
      ]),
    ).toBe(500);
    expect(
      mustSellAvailability([
        { mustSell: true, stock: 4 },
        { mustSell: true, stock: 0 },
        { mustSell: false, stock: 0 },
      ]),
    ).toBe(0.5);
    expect(loadingIndex(12, 18)).toBe(-6);
  });
  it('flags resolved before act-by, out of closed flags only', () => {
    const r = flagsResolvedBeforeActBy([
      { actBy: '2026-11-10', resolvedOn: '2026-11-03' }, // in time
      { actBy: '2026-10-30', resolvedOn: '2026-11-01' }, // late
      { actBy: null, resolvedOn: '2026-11-01' }, // no act-by: in time
      { actBy: '2026-10-31', resolvedOn: null }, // open: counted once it closes
    ]);
    expect(r).toEqual({ resolvedInTime: 2, closed: 3, rate: 2 / 3 });
  });
});
