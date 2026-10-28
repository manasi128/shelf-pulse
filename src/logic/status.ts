import { THRESHOLDS } from '../config/thresholds';
import type { Status } from './types';

export interface StatusInput {
  cover: number;
  lifeLeft: number;
  signalCount: number;
  /** Days from today to the act-by date (negative = passed); null = no act-by date. */
  daysToActBy: number | null;
}

/**
 * Evaluated in this order:
 * RED   if act-by is within 30 days (or already passed);
 * GREEN if cover ≤ (life − 30) and cover ≤ 60 and fewer than 2 signals;
 * AMBER otherwise.
 */
export function computeStatus(input: StatusInput, cfg = THRESHOLDS.status): Status {
  const { cover, lifeLeft, signalCount, daysToActBy } = input;
  if (daysToActBy != null && daysToActBy <= cfg.redActByWithinDays) return 'red';
  if (
    cover <= lifeLeft - cfg.greenLifeBufferDays &&
    cover <= cfg.greenMaxCoverDays &&
    signalCount < cfg.greenMaxSignalsExclusive
  ) {
    return 'green';
  }
  return 'amber';
}
