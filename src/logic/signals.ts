import type { SignalId } from './types';

/** Signals the rep can tick, in the order shown. The auto signal is added by the app. */
export const MANUAL_SIGNALS: readonly SignalId[] = [
  'dust_faded',
  'backroom_cartons',
  'no_facing',
  'discount_ask',
  'damaged_pack',
];

/** AUTO: same batch code as last visit, with zero sales since. */
export function sameBatchNoSales(batchToday: string | undefined, batchLastVisit: string | undefined, salesUnits: number): boolean {
  if (!batchToday || !batchLastVisit) return false;
  return batchToday.trim().toUpperCase() === batchLastVisit.trim().toUpperCase() && salesUnits === 0;
}

/** Manual signals plus the auto signal, de-duplicated. */
export function collectSignals(manual: readonly SignalId[], autoSameBatch: boolean): SignalId[] {
  const all = new Set<SignalId>(manual);
  if (autoSameBatch) all.add('same_batch_no_sales');
  return [...all];
}
