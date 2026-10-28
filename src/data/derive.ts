/**
 * The bridge between stored data and /src/logic: everything a screen shows is derived here,
 * so a changed count flows straight through to sales, cover, act-by, status and actions.
 */
import {
  amberPlaybook,
  bestReceiver,
  checkTransfer,
  escalate,
  evaluateLine,
  forecastRate,
  rankBeat,
  ratesNewestFirst,
  recoveryLadder,
  salesNewestFirst,
  suggestOrder,
  type Escalation,
  type ISODate,
  type LadderResult,
  type LineEvaluation,
  type PlaybookStep,
  type RankedOutlet,
  type ReceiverCandidate,
  type SuggestedOrder,
  type TransferCheck,
  type VisitCount,
} from '../logic';
import type { Dataset, Outlet, Sku, StockLine, VisitDraft } from './schema';

export type Drafts = Record<string, VisitDraft | undefined>;

export interface LineView {
  line: StockLine;
  sku: Sku;
  /** True once the rep has counted this SKU today. */
  counted: boolean;
  stockNow: number;
  batchNow: string;
  evaluation: LineEvaluation;
  receiver: ReceiverCandidate | null;
  transfer: TransferCheck | null;
  escalation: Escalation;
  /** Amber only. */
  playbook: PlaybookStep[] | null;
  /** Red only. */
  ladder: LadderResult | null;
}

/** Past visits, plus today's count if the rep has made one. */
export function lineVisits(line: StockLine, draft: VisitDraft | undefined, today: ISODate): VisitCount[] {
  const count = draft?.counts[line.skuId];
  if (!count) return line.visits;
  return [
    ...line.visits,
    { date: today, stock: count.stock, deliveredSincePrev: line.pendingDelivered, batch: count.batch ?? line.batch },
  ];
}

/** Other outlets on the beat that could receive this SKU. */
export function receiverCandidates(data: Dataset, skuId: string, excludeOutletId: string, drafts: Drafts, today: ISODate): ReceiverCandidate[] {
  const outlets = new Map(data.outlets.map((o) => [o.id, o]));
  return data.lines
    .filter((l) => l.skuId === skuId && l.outletId !== excludeOutletId)
    .map((l) => {
      const visits = lineVisits(l, drafts[l.outletId], today);
      return {
        outletId: l.outletId,
        recentVisitSales: salesNewestFirst(visits),
        forecastRate: forecastRate(ratesNewestFirst(visits)),
        nextRunDate: outlets.get(l.outletId)?.nextRunDate ?? null,
      };
    });
}

export function viewLine(data: Dataset, line: StockLine, drafts: Drafts, today: ISODate): LineView {
  const sku = data.skus.find((s) => s.id === line.skuId)!;
  const draft = drafts[line.outletId];
  const count = draft?.counts[line.skuId];
  const visits = lineVisits(line, draft, today);
  const stockNow = visits[visits.length - 1].stock;
  const value = stockNow * sku.unitPrice;
  const receiver = bestReceiver(receiverCandidates(data, line.skuId, line.outletId, drafts, today), value);

  const evaluation = evaluateLine({
    today,
    expiry: line.expiry,
    visits,
    manualSignals: count ? (draft?.signals[line.skuId] ?? []) : line.lastSignals,
    bestReceiverRate: receiver?.forecastRate ?? null,
    unitPrice: sku.unitPrice,
  });

  const transfer = receiver
    ? checkTransfer({ value, receiver, weeksSinceSoldInBySameRep: line.weeksSinceSoldIn })
    : null;

  const stepsToday = draft?.stepsDone[line.skuId];
  const playbook =
    evaluation.status === 'amber'
      ? amberPlaybook({
          attemptsByVisit: stepsToday?.length ? [...line.attempts, stepsToday] : line.attempts,
          sealed: !evaluation.signals.includes('damaged_pack'),
          heroSkuAvailable: sku.heroSkuId != null,
          minisAvailable: sku.hasMinis,
        })
      : null;

  const ladder =
    evaluation.status === 'red'
      ? recoveryLadder({
          lifeLeft: evaluation.lifeLeft,
          sealed: !evaluation.signals.includes('damaged_pack'),
          damagedPack: evaluation.signals.includes('damaged_pack'),
          professionalRange: sku.professional,
          hasEligibleReceiver: receiver != null,
        })
      : null;

  return {
    line,
    sku,
    counted: count != null,
    stockNow,
    batchNow: count?.batch ?? line.batch,
    evaluation,
    receiver,
    transfer,
    escalation: escalate(evaluation.status),
    playbook,
    ladder,
  };
}

export function outletLines(data: Dataset, outletId: string, drafts: Drafts, today: ISODate): LineView[] {
  const order = new Map(data.skus.map((s, i) => [s.id, i]));
  return data.lines
    .filter((l) => l.outletId === outletId)
    .sort((a, b) => (order.get(a.skuId) ?? 0) - (order.get(b.skuId) ?? 0))
    .map((l) => viewLine(data, l, drafts, today));
}

export function openFlagCount(data: Dataset, outletId: string): number {
  return data.flags.filter((f) => f.outletId === outletId && f.state === 'open').length;
}

export interface RankedOutletView extends RankedOutlet {
  outlet: Outlet;
  lines: LineView[];
}

/** Today's beat, riskiest first. */
export function rankToday(data: Dataset, drafts: Drafts, today: ISODate): RankedOutletView[] {
  const byOutlet = new Map(data.outlets.map((o) => [o.id, outletLines(data, o.id, drafts, today)]));
  const ranked = rankBeat(
    [...data.outlets]
      .sort((a, b) => a.routeOrder - b.routeOrder)
      .map((o) => ({
        outletId: o.id,
        openFlags: openFlagCount(data, o.id),
        lines: byOutlet.get(o.id)!.map((v) => ({
          status: v.evaluation.status,
          stockValue: v.evaluation.stockValue,
          daysToActBy: v.evaluation.daysToActBy,
        })),
      })),
  );
  return ranked.map((r) => ({ ...r, outlet: data.outlets.find((o) => o.id === r.outletId)!, lines: byOutlet.get(r.outletId)! }));
}

/** Suggested order for one outlet, from today's evaluations. */
export function orderForOutlet(data: Dataset, outletId: string, drafts: Drafts, today: ISODate): SuggestedOrder {
  const outlet = data.outlets.find((o) => o.id === outletId)!;
  const asks = drafts[outletId]?.answers.rangeAsks ?? outlet.rangeAsks;
  const onList = new Set(data.lines.filter((l) => l.outletId === outletId).map((l) => l.skuId));
  return suggestOrder({
    lines: outletLines(data, outletId, drafts, today).map((v) => ({
      skuId: v.sku.id,
      status: v.evaluation.status,
      forecastRate: v.evaluation.forecastRate,
      stock: v.stockNow,
      unitPrice: v.sku.unitPrice,
      mustSell: v.sku.mustSell,
      usualQty: v.line.orders[0] ?? 0,
    })),
    daysToNextVisit: outlet.daysToNextVisit,
    rangeGaps: asks
      .filter((id) => !onList.has(id))
      .map((id) => ({ skuId: id, unitPrice: data.skus.find((s) => s.id === id)?.unitPrice ?? 0 })),
  });
}

