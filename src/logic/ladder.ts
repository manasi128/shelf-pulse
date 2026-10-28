import { THRESHOLDS } from '../config/thresholds';

/** Near-expiry (red) recovery ladder, in order. First eligible wins. */
export const LADDER_RUNGS = [
  'transfer',
  'salon_backbar',
  'b2b_buyer',
  'staff_sale',
  'donation',
  'tester',
  'epr_recycling',
] as const;
export type LadderRung = (typeof LADDER_RUNGS)[number];

export interface LadderInput {
  lifeLeft: number;
  sealed: boolean;
  damagedPack: boolean;
  professionalRange: boolean;
  /** An eligible receiving outlet exists (see transfer rules). */
  hasEligibleReceiver: boolean;
}

export interface RungResult {
  rung: LadderRung;
  eligible: boolean;
}

export interface LadderResult {
  rungs: RungResult[];
  chosen: LadderRung;
  /** Always shown for red stock. */
  stopShippingBatch: true;
}

/**
 * transfer to a faster outlet (life − 7 ≥ 60) → salon back-bar/academy (professional, life ≥ 20)
 * → approved B2B buyer (sealed, life ≥ 45) → staff sale (life ≥ 30) → donation, not for sale (sealed, life ≥ 30)
 * → damaged pack as in-store tester → EPR packaging recycling.
 * Never unlabelled discounting: there is deliberately no discount rung.
 */
export function recoveryLadder(input: LadderInput, cfg = THRESHOLDS.ladder, lead = THRESHOLDS.actBy.transferLeadDays): LadderResult {
  const { lifeLeft: life, sealed, damagedPack, professionalRange, hasEligibleReceiver } = input;
  const rules: Record<LadderRung, boolean> = {
    transfer: hasEligibleReceiver && life - lead >= cfg.transferMinLifeAfterLeadDays,
    salon_backbar: professionalRange && life >= cfg.salonMinLifeDays,
    b2b_buyer: sealed && life >= cfg.b2bMinLifeDays,
    staff_sale: life >= cfg.staffSaleMinLifeDays,
    donation: sealed && life >= cfg.donationMinLifeDays,
    tester: damagedPack && life > 0,
    epr_recycling: true,
  };
  const rungs = LADDER_RUNGS.map((rung) => ({ rung, eligible: rules[rung] }));
  const chosen = rungs.find((r) => r.eligible)!.rung;
  return { rungs, chosen, stopShippingBatch: true };
}
