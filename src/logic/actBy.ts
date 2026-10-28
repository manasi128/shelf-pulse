import { THRESHOLDS } from '../config/thresholds';
import { addDays } from './dates';
import type { ISODate } from './types';

export interface ActByInput {
  expiry: ISODate;
  /** Units that would need to move. */
  units: number;
  /** Forecast rate (units/day) at the best eligible receiving outlet; null when there is none. */
  bestReceiverRate: number | null;
  /** Days of cover at this outlet: used as days-to-sell when there is no eligible receiver. */
  coverHere: number;
}

export interface ActByResult {
  /** Last date to start a move; null when the stock cannot sell anywhere at current rates. */
  date: ISODate | null;
  daysToSell: number;
  usedFallback: boolean;
}

/**
 * Act-by = expiry − receiver's minimum shelf life (60) − days to sell at the best receiver − transfer lead (7).
 * Pilot default: with no eligible receiver, days to sell = days of cover here (an earlier, safer date).
 */
export function actByDate(input: ActByInput, cfg = THRESHOLDS.actBy): ActByResult {
  const { expiry, units, bestReceiverRate, coverHere } = input;
  const usedFallback = bestReceiverRate == null || bestReceiverRate <= 0;
  const daysToSell = usedFallback ? coverHere : units / bestReceiverRate;
  if (!Number.isFinite(daysToSell)) return { date: null, daysToSell, usedFallback };
  const offset = cfg.receiverMinShelfLifeDays + Math.ceil(daysToSell) + cfg.transferLeadDays;
  return { date: addDays(expiry, -offset), daysToSell, usedFallback };
}
