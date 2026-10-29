import type { SignalId } from '../logic/types';
import type { AmberStep } from '../logic/playbook';
import type { Dataset, Flag, ResolutionRecord, StockLine } from './schema';

interface CompactLine {
  expiry?: string;
  batch?: string;
  stock?: number[];
  delivered?: number[];
  pendingDelivered?: number;
  orders?: number[];
  lastSignals?: string[];
  attempts?: string[][];
  weeksSinceSoldIn?: number | null;
}

/** Shape of seed.json: compact per-outlet overrides on top of healthy per-SKU patterns. */
export interface SeedFile {
  version: number;
  meta: Dataset['meta'];
  beatDates: string[];
  skus: Dataset['skus'];
  redList: string[];
  patterns: Record<string, CompactLine>;
  outlets: (Omit<Dataset['outlets'][number], never> & { lines: Record<string, CompactLine> })[];
  partners: Dataset['partners'];
  godown: Dataset['godown'];
  flags: (Omit<Flag, 'unitPrice' | 'proposal'> & { proposal: Record<string, unknown> })[];
  trends: Dataset['trends'];
}

/** Expand the compact seed into full records. Pure, so tests can use it without a database. */
export function expandSeed(seed: SeedFile): Dataset {
  const skuById = new Map(seed.skus.map((s) => [s.id, s]));
  const dates = seed.beatDates;

  const lines: StockLine[] = [];
  const outlets = seed.outlets.map(({ lines: overrides, ...outlet }) => {
    for (const skuId of seed.redList) {
      const c: CompactLine = { ...seed.patterns[skuId], ...overrides[skuId] };
      const stock = c.stock ?? [];
      if (stock.length !== dates.length) throw new Error(`seed: ${outlet.id}/${skuId} needs ${dates.length} counts`);
      lines.push({
        id: `${outlet.id}:${skuId}`,
        outletId: outlet.id,
        skuId,
        batch: c.batch!,
        expiry: c.expiry!,
        visits: dates.map((date, i) => ({
          date,
          stock: stock[i],
          deliveredSincePrev: i === 0 ? 0 : (c.delivered?.[i - 1] ?? 0),
          batch: c.batch,
        })),
        pendingDelivered: c.pendingDelivered ?? 0,
        lastSignals: (c.lastSignals ?? []) as SignalId[],
        attempts: (c.attempts ?? []) as AmberStep[][],
        orders: c.orders ?? [0],
        weeksSinceSoldIn: c.weeksSinceSoldIn ?? null,
      });
    }
    return outlet;
  });

  const flags: Flag[] = seed.flags.map((f) => ({
    ...f,
    proposal: f.proposal as Flag['proposal'],
    unitPrice: skuById.get(f.skuId)!.unitPrice,
  }));

  const resolutions: ResolutionRecord[] = flags
    .filter((f) => f.state === 'resolved')
    .map((f) => ({
      id: `r-${f.id}`,
      flagId: f.id,
      outletId: f.outletId,
      skuId: f.skuId,
      route: f.proposal.route,
      units: f.units,
      unitPrice: f.unitPrice,
      packagingGrams: skuById.get(f.skuId)!.packagingGrams,
      date: f.resolvedOn!,
    }));

  return {
    skus: seed.skus.map((s, i) => ({ ...s, sortIndex: i })),
    outlets,
    lines,
    flags,
    resolutions,
    partners: seed.partners,
    godown: seed.godown,
    trends: seed.trends,
    meta: seed.meta,
  };
}
