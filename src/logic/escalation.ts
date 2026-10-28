import { THRESHOLDS } from '../config/thresholds';
import type { Status } from './types';

export type Owner = 'rep' | 'area_manager' | 'area_manager_and_regional_head' | 'category_team';

export interface Escalation {
  owners: Owner[];
  /** Deadline to decide, in hours from the flag. 0 = in this visit. */
  decideWithinHours: number;
}

/**
 * Green → rep fixes in the same visit.
 * Amber → area manager, decide within 7 days.
 * Red   → area manager + regional head, route chosen within 48 hours.
 */
export function escalate(status: Status, cfg = THRESHOLDS.escalation): Escalation {
  switch (status) {
    case 'green':
      return { owners: ['rep'], decideWithinHours: 0 };
    case 'amber':
      return { owners: ['area_manager'], decideWithinHours: cfg.amberDecideWithinDays * 24 };
    case 'red':
      return { owners: ['area_manager_and_regional_head'], decideWithinHours: cfg.redDecideWithinHours };
  }
}

/** SKUs red in many outlets → category team, monthly demand review. */
export function skusForCategoryReview(
  lines: readonly { skuId: string; outletId: string; status: Status }[],
  cfg = THRESHOLDS.escalation,
): string[] {
  const redOutlets = new Map<string, Set<string>>();
  for (const l of lines) {
    if (l.status !== 'red') continue;
    if (!redOutlets.has(l.skuId)) redOutlets.set(l.skuId, new Set());
    redOutlets.get(l.skuId)!.add(l.outletId);
  }
  return [...redOutlets]
    .filter(([, outlets]) => outlets.size >= cfg.categoryReviewMinRedOutlets)
    .map(([sku]) => sku);
}

export type RetailerCredit = 'swap_to_fast_sellers' | 'standard_settlement';

/** Green credit: flagging at amber earns a swap into fast sellers; a late return at expiry gets standard settlement. */
export function retailerCredit(flaggedAt: Status | 'expired'): RetailerCredit {
  return flaggedAt === 'amber' ? 'swap_to_fast_sellers' : 'standard_settlement';
}
