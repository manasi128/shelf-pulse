import { THRESHOLDS } from '../config/thresholds';

/**
 * Forecast rate/day = 0.5 × this visit's rate + 0.3 × previous + 0.2 × the one before.
 * `rates` is newest first. With fewer than three intervals, the available weights
 * are rescaled to sum to 1. No history → 0.
 */
export function forecastRate(rates: readonly number[], weights: readonly number[] = THRESHOLDS.forecast.weights): number {
  const n = Math.min(rates.length, weights.length);
  if (n === 0) return 0;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < n; i++) {
    sum += weights[i] * rates[i];
    weightSum += weights[i];
  }
  return sum / weightSum;
}
