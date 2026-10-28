import { actByDate } from './actBy';
import { daysOfCover, daysOfLifeLeft, stockRiskRatio } from './cover';
import { daysBetween } from './dates';
import { forecastRate } from './forecast';
import { ratesNewestFirst, salesSinceLastVisit } from './sales';
import { collectSignals, sameBatchNoSales } from './signals';
import { computeStatus } from './status';
import type { ISODate, SignalId, Status, VisitCount } from './types';

export interface LineInput {
  today: ISODate;
  expiry: ISODate;
  /** Oldest → newest; the last entry is today's count. */
  visits: readonly VisitCount[];
  manualSignals: readonly SignalId[];
  /** Forecast rate at the best eligible receiving outlet, if any. */
  bestReceiverRate: number | null;
  unitPrice: number;
}

export interface LineEvaluation {
  salesSinceLast: number;
  needsRecount: boolean;
  rateThisVisit: number;
  forecastRate: number;
  cover: number;
  lifeLeft: number;
  actBy: ISODate | null;
  daysToActBy: number | null;
  actByUsedFallback: boolean;
  signals: SignalId[];
  status: Status;
  riskRatio: number;
  stockValue: number;
}

/** Everything the rep's screen shows for one SKU line, from the counts alone. */
export function evaluateLine(input: LineInput): LineEvaluation {
  const { today, expiry, visits, manualSignals, bestReceiverRate, unitPrice } = input;
  const current = visits[visits.length - 1];
  const previous = visits.length > 1 ? visits[visits.length - 2] : undefined;

  const sales = previous
    ? salesSinceLastVisit(previous.stock, current.deliveredSincePrev, current.stock)
    : { units: 0, needsRecount: false };
  const rates = ratesNewestFirst(visits);
  const rate = forecastRate(rates);
  const cover = daysOfCover(current.stock, rate);
  const lifeLeft = daysOfLifeLeft(expiry, today);
  const actBy = actByDate({ expiry, units: current.stock, bestReceiverRate, coverHere: cover });
  const daysToActBy = actBy.date ? daysBetween(today, actBy.date) : null;
  const signals = collectSignals(
    manualSignals,
    previous != null && sameBatchNoSales(current.batch, previous.batch, sales.units),
  );
  const status = current.stock <= 0 ? 'green' : computeStatus({ cover, lifeLeft, signalCount: signals.length, daysToActBy });

  return {
    salesSinceLast: sales.units,
    needsRecount: sales.needsRecount,
    rateThisVisit: rates[0] ?? 0,
    forecastRate: rate,
    cover,
    lifeLeft,
    actBy: actBy.date,
    daysToActBy,
    actByUsedFallback: actBy.usedFallback,
    signals,
    status,
    riskRatio: stockRiskRatio(cover, lifeLeft),
    stockValue: current.stock * unitPrice,
  };
}
