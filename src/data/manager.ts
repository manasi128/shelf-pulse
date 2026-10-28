/**
 * Everything the area manager's desk shows, derived from the same data and logic as the rep app.
 */
import {
  atRiskValue,
  daysBetween,
  flagsResolvedBeforeActBy,
  loadingIndex,
  mustSellAvailability,
  skusForCategoryReview,
  sustainabilityTally,
  type ISODate,
  type SustainabilityTally,
} from '../logic';
import { outletLines, type Drafts, type LineView } from './derive';
import type { Dataset, Flag, Outlet, Sku } from './schema';

export interface QueueItem {
  flag: Flag;
  outlet: Outlet;
  sku: Sku;
  value: number;
  /** Days until the decide-by date (negative = overdue). */
  daysToDecide: number;
  receiver?: Outlet;
  partnerName?: string;
  /** Today's evidence for the line, if it is still on the outlet's red list. */
  evidence?: LineView;
}

const STATUS_ORDER = { red: 0, amber: 1, green: 2 } as const;

/** Open flags, red first, then the nearest deadline. */
export function flagQueue(data: Dataset, drafts: Drafts, today: ISODate): QueueItem[] {
  const views = new Map<string, LineView[]>();
  return data.flags
    .filter((f) => f.state === 'open')
    .map((flag) => {
      const outlet = data.outlets.find((o) => o.id === flag.outletId)!;
      if (!views.has(outlet.id)) views.set(outlet.id, outletLines(data, outlet.id, drafts, today));
      const p = flag.proposal;
      return {
        flag,
        outlet,
        sku: data.skus.find((s) => s.id === flag.skuId)!,
        value: flag.units * flag.unitPrice,
        daysToDecide: daysBetween(today, flag.decideBy),
        receiver: p.kind === 'route' && p.receiverOutletId ? data.outlets.find((o) => o.id === p.receiverOutletId) : undefined,
        partnerName: p.kind === 'route' && p.partnerId ? data.partners.find((x) => x.id === p.partnerId)?.name : undefined,
        evidence: views.get(outlet.id)!.find((v) => v.sku.id === flag.skuId),
      };
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.flag.status] - STATUS_ORDER[b.flag.status] || a.daysToDecide - b.daysToDecide || b.value - a.value,
    );
}

/** Flags decided in the last 7 days, newest first. */
export function recentDecisions(data: Dataset, today: ISODate): Flag[] {
  return data.flags
    .filter((f) => (f.state === 'approved' || f.state === 'declined') && f.decidedOn && daysBetween(f.decidedOn, today) <= 7)
    .sort((a, b) => (b.decidedOn ?? '').localeCompare(a.decidedOn ?? ''));
}

export interface TerritoryRow {
  outlet: Outlet;
  red: number;
  amber: number;
  atRisk: number;
  openFlags: number;
  visited: boolean;
  mustSellOnShelf: boolean;
}

export function territory(data: Dataset, drafts: Drafts, today: ISODate) {
  const all = data.outlets.map((o) => ({ outlet: o, lines: outletLines(data, o.id, drafts, today) }));
  const rows: TerritoryRow[] = all.map(({ outlet, lines }) => ({
    outlet,
    red: lines.filter((l) => l.evaluation.status === 'red').length,
    amber: lines.filter((l) => l.evaluation.status === 'amber').length,
    atRisk: atRiskValue(lines.map((l) => l.evaluation)),
    openFlags: data.flags.filter((f) => f.outletId === outlet.id && f.state === 'open').length,
    visited: drafts[outlet.id]?.completedAt != null,
    mustSellOnShelf: lines.filter((l) => l.sku.mustSell).every((l) => l.stockNow > 0),
  }));
  const category = skusForCategoryReview(
    all.flatMap(({ outlet, lines }) => lines.map((l) => ({ skuId: l.sku.id, outletId: outlet.id, status: l.evaluation.status }))),
  ).map((skuId) => ({
    sku: data.skus.find((s) => s.id === skuId)!,
    outlets: all.filter(({ lines }) => lines.some((l) => l.sku.id === skuId && l.evaluation.status === 'red')).length,
  }));
  rows.sort((a, b) => b.red - a.red || b.amber - a.amber || b.atRisk - a.atRisk);
  return { rows, category, lines: all.flatMap((x) => x.lines) };
}

export interface Kpis {
  returnRatePct: number;
  controlReturnRatePct: number;
  returnRateChangePct: number;
  atRisk: number;
  resolved: { resolvedInTime: number; due: number; rate: number };
  mustSellOsa: number;
  loadingIndexPts: number;
  primaryGrowthPct: number;
  secondaryGrowthPct: number;
  tally: SustainabilityTally;
}

export function kpis(data: Dataset, drafts: Drafts, today: ISODate): Kpis {
  const t = data.trends;
  const lines = data.outlets.flatMap((o) => outletLines(data, o.id, drafts, today));
  const last = t.returnExpiryRatePct.length - 1;
  return {
    returnRatePct: t.returnExpiryRatePct[last],
    controlReturnRatePct: t.controlReturnExpiryRatePct[last],
    returnRateChangePct: t.returnExpiryRatePct[last] - t.returnExpiryRatePct[0],
    atRisk: atRiskValue(lines.map((l) => l.evaluation)),
    resolved: flagsResolvedBeforeActBy(data.flags, today),
    mustSellOsa: mustSellAvailability(lines.map((l) => ({ mustSell: l.sku.mustSell, stock: l.stockNow }))),
    loadingIndexPts: loadingIndex(t.primaryGrowthPct, t.secondaryGrowthPct),
    primaryGrowthPct: t.primaryGrowthPct,
    secondaryGrowthPct: t.secondaryGrowthPct,
    tally: sustainabilityTally(data.resolutions),
  };
}
