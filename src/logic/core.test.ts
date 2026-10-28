import { describe, expect, it } from 'vitest';
import {
  actByDate,
  addDays,
  computeStatus,
  daysBetween,
  daysOfCover,
  daysOfLifeLeft,
  evaluateLine,
  forecastRate,
  salesSinceLastVisit,
  sameBatchNoSales,
  collectSignals,
  type VisitCount,
} from './index';

describe('dates', () => {
  it('counts whole days across months and years', () => {
    expect(daysBetween('2026-11-02', '2027-01-01')).toBe(60);
    expect(addDays('2027-06-30', -87)).toBe('2027-04-04');
  });
});

describe('shop sales since last visit', () => {
  it('= stock at last visit + delivered since − stock today', () => {
    expect(salesSinceLastVisit(10, 5, 8)).toEqual({ units: 7, needsRecount: false });
  });
  it('never goes negative; asks for a recount instead', () => {
    expect(salesSinceLastVisit(10, 0, 12)).toEqual({ units: 0, needsRecount: true });
  });
});

describe('forecast rate', () => {
  it('weights 0.5 / 0.3 / 0.2, newest first', () => {
    expect(forecastRate([2, 1, 0.5])).toBeCloseTo(1.4);
  });
  it('rescales weights with fewer than three visits', () => {
    expect(forecastRate([2, 1])).toBeCloseTo(1.3 / 0.8);
    expect(forecastRate([3])).toBe(3);
  });
  it('ignores history older than three intervals', () => {
    expect(forecastRate([2, 1, 0.5, 100])).toBeCloseTo(1.4);
  });
  it('is 0 with no history', () => {
    expect(forecastRate([])).toBe(0);
  });
});

describe('cover and life', () => {
  it('days of cover = stock ÷ rate', () => {
    expect(daysOfCover(14, 1.4)).toBeCloseTo(10);
  });
  it('is infinite when nothing sells, 0 when nothing is left', () => {
    expect(daysOfCover(5, 0)).toBe(Infinity);
    expect(daysOfCover(0, 0)).toBe(0);
  });
  it('days of life left = expiry − today', () => {
    expect(daysOfLifeLeft('2027-01-01', '2026-11-02')).toBe(60);
  });
});

describe('act-by date', () => {
  it('= expiry − 60 − days to sell at best receiver − 7', () => {
    const r = actByDate({ expiry: '2027-06-30', units: 20, bestReceiverRate: 1, coverHere: 99 });
    expect(r).toEqual({ date: '2027-04-04', daysToSell: 20, usedFallback: false });
  });
  it('rounds days to sell up', () => {
    expect(actByDate({ expiry: '2027-06-30', units: 21, bestReceiverRate: 2, coverHere: 0 }).date).toBe('2027-04-13');
  });
  it('falls back to cover here when no receiver is eligible', () => {
    const r = actByDate({ expiry: '2027-06-30', units: 20, bestReceiverRate: null, coverHere: 12.5 });
    expect(r.date).toBe('2027-04-11');
    expect(r.usedFallback).toBe(true);
  });
  it('has no date when nothing sells anywhere', () => {
    expect(actByDate({ expiry: '2027-06-30', units: 5, bestReceiverRate: null, coverHere: Infinity }).date).toBeNull();
  });
});

describe('status', () => {
  const healthy = { cover: 10, lifeLeft: 100, signalCount: 0, daysToActBy: 60 };
  it('GREEN when cover ≤ life − 30, cover ≤ 60 and fewer than 2 signals', () => {
    expect(computeStatus(healthy)).toBe('green');
    expect(computeStatus({ ...healthy, signalCount: 1 })).toBe('green');
    expect(computeStatus({ ...healthy, cover: 60 })).toBe('green');
    expect(computeStatus({ ...healthy, cover: 70, lifeLeft: 200 })).toBe('amber');
  });
  it('RED when act-by is within 30 days, including passed, and RED wins over GREEN', () => {
    expect(computeStatus({ ...healthy, daysToActBy: 30 })).toBe('red');
    expect(computeStatus({ ...healthy, daysToActBy: -5 })).toBe('red');
    expect(computeStatus({ ...healthy, daysToActBy: 31 })).toBe('green');
  });
  it('AMBER otherwise', () => {
    expect(computeStatus({ ...healthy, signalCount: 2 })).toBe('amber');
    expect(computeStatus({ ...healthy, cover: 61, lifeLeft: 200 })).toBe('amber');
    expect(computeStatus({ ...healthy, cover: 71 })).toBe('amber'); // cover > life − 30
    expect(computeStatus({ cover: Infinity, lifeLeft: 300, signalCount: 0, daysToActBy: null })).toBe('amber');
  });
  it('reads thresholds from config', () => {
    const strict = { greenLifeBufferDays: 30, greenMaxCoverDays: 5, greenMaxSignalsExclusive: 2, redActByWithinDays: 30 };
    expect(computeStatus(healthy, strict)).toBe('amber');
  });
});

describe('signals', () => {
  it('AUTO: same batch code as last visit with zero sales', () => {
    expect(sameBatchNoSales('b123', 'B123 ', 0)).toBe(true);
    expect(sameBatchNoSales('B123', 'B123', 1)).toBe(false);
    expect(sameBatchNoSales('B124', 'B123', 0)).toBe(false);
    expect(sameBatchNoSales(undefined, 'B123', 0)).toBe(false);
  });
  it('de-duplicates', () => {
    expect(collectSignals(['dust_faded', 'dust_faded'], true)).toEqual(['dust_faded', 'same_batch_no_sales']);
  });
});

describe('evaluateLine: changing a count updates everything', () => {
  const today = '2026-11-02';
  const history: VisitCount[] = [
    { date: '2026-10-12', stock: 30, deliveredSincePrev: 0, batch: 'SN24' },
    { date: '2026-10-19', stock: 24, deliveredSincePrev: 0, batch: 'SN24' },
    { date: '2026-10-26', stock: 18, deliveredSincePrev: 0, batch: 'SN24' },
  ];
  const line = (stockToday: number, expiry: string, manual: ('dust_faded')[] = []) =>
    evaluateLine({
      today,
      expiry,
      visits: [...history, { date: today, stock: stockToday, deliveredSincePrev: 0, batch: 'SN24' }],
      manualSignals: manual,
      bestReceiverRate: null,
      unitPrice: 450,
    });

  it('selling at the usual pace is green', () => {
    const e = line(12, '2027-04-15');
    expect(e.salesSinceLast).toBe(6);
    expect(e.forecastRate).toBeCloseTo(6 / 7);
    expect(e.cover).toBeCloseTo(14);
    expect(e.lifeLeft).toBe(164);
    expect(e.actBy).toBe('2027-01-24');
    expect(e.status).toBe('green');
    expect(e.stockValue).toBe(5400);
  });

  it('no sales since last visit adds the auto signal and pushes act-by earlier', () => {
    const e = line(18, '2027-04-15', ['dust_faded']);
    expect(e.salesSinceLast).toBe(0);
    expect(e.signals).toContain('same_batch_no_sales');
    expect(e.cover).toBeCloseTo(42);
    expect(e.actBy).toBe('2026-12-27');
    expect(e.status).toBe('amber');
  });

  it('the same count on a shorter-dated batch turns red', () => {
    const e = line(18, '2027-02-15');
    expect(e.actBy).toBe('2026-10-29');
    expect(e.daysToActBy).toBe(-4);
    expect(e.status).toBe('red');
  });

  it('a count that does not add up asks for a recount', () => {
    expect(line(25, '2027-04-15').needsRecount).toBe(true);
  });

  it('an empty shelf is not at risk', () => {
    expect(line(0, '2027-02-15').status).toBe('green');
  });
});
