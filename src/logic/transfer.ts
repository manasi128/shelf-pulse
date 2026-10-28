import { THRESHOLDS } from '../config/thresholds';
import type { ISODate } from './types';

export interface ReceiverCandidate {
  outletId: string;
  /** Units sold at this outlet in each of its recent visits, newest first. */
  recentVisitSales: readonly number[];
  forecastRate: number;
  /** Next existing distributor delivery run to this outlet, if any. */
  nextRunDate: ISODate | null;
}

export type TransferBlock = 'no_receiver_demand' | 'below_min_value' | 'no_existing_run';

export interface TransferCheck {
  ok: boolean;
  blocks: TransferBlock[];
  /** Rep incentive applies unless the same rep sold this stock in within 8 weeks. */
  incentiveEligible: boolean;
}

/** Receiver must show demand (a sale) in each of its last 3 visits. */
export function receiverShowsDemand(recentVisitSales: readonly number[], cfg = THRESHOLDS.transfer): boolean {
  const lastN = recentVisitSales.slice(0, cfg.receiverDemandVisits);
  return lastN.length >= cfg.receiverDemandVisits && lastN.every((u) => u > 0);
}

export function checkTransfer(
  args: {
    value: number;
    receiver: ReceiverCandidate;
    /** Weeks since the same rep sold this stock in at the sending outlet; null if not this rep / unknown. */
    weeksSinceSoldInBySameRep: number | null;
  },
  cfg = THRESHOLDS.transfer,
): TransferCheck {
  const blocks: TransferBlock[] = [];
  if (!receiverShowsDemand(args.receiver.recentVisitSales, cfg)) blocks.push('no_receiver_demand');
  if (args.value < cfg.minValueRupees) blocks.push('below_min_value');
  if (!args.receiver.nextRunDate) blocks.push('no_existing_run');
  const incentiveEligible =
    args.weeksSinceSoldInBySameRep == null || args.weeksSinceSoldInBySameRep >= cfg.noIncentiveIfSoldInWithinWeeks;
  return { ok: blocks.length === 0, blocks, incentiveEligible };
}

/** Eligible receiver with the highest forecast rate; ties go to the earliest run. */
export function bestReceiver(
  candidates: readonly ReceiverCandidate[],
  value: number,
  cfg = THRESHOLDS.transfer,
): ReceiverCandidate | null {
  const ok = candidates.filter((c) => checkTransfer({ value, receiver: c, weeksSinceSoldInBySameRep: null }, cfg).ok);
  ok.sort((a, b) => b.forecastRate - a.forecastRate || (a.nextRunDate ?? '').localeCompare(b.nextRunDate ?? ''));
  return ok[0] ?? null;
}

/**
 * Settled through the distributor: credit note to the sender, invoice to the receiver.
 * Rep payout is released only when the stock sells at the receiver.
 */
export const TRANSFER_SETTLEMENT = {
  via: 'distributor',
  creditNoteTo: 'sender',
  invoiceTo: 'receiver',
  payoutReleasedWhen: 'sold_at_receiver',
} as const;
