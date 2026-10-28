import { THRESHOLDS } from '../config/thresholds';

/** SKUs not reordered for 2+ cycles. `orderedQtyByVisit` is newest first. */
export function notReordered(
  history: readonly { skuId: string; orderedQtyByVisit: readonly number[] }[],
  cfg = THRESHOLDS.brief,
): string[] {
  return history
    .filter((h) => {
      const recent = h.orderedQtyByVisit.slice(0, cfg.notReorderedCycles);
      return recent.length >= cfg.notReorderedCycles && recent.every((q) => q === 0);
    })
    .map((h) => h.skuId);
}

/** Launch seeding: outlets ordered by proven demand in the launch's category, best first. */
export function seedLaunchOutlets(
  outlets: readonly { outletId: string; categoryRatePerDay: number; recentVisitSales: readonly number[] }[],
  minVisitsWithSales = THRESHOLDS.transfer.receiverDemandVisits,
): string[] {
  return outlets
    .filter((o) => o.recentVisitSales.slice(0, minVisitsWithSales).filter((u) => u > 0).length >= minVisitsWithSales)
    .sort((a, b) => b.categoryRatePerDay - a.categoryRatePerDay)
    .map((o) => o.outletId);
}
