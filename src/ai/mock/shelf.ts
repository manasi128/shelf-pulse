import { db } from '../../data/db';
import type { DemoMeta } from '../../data/schema';
import type { ShelfReader, ShelfReadingItem } from '../types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock shelf reader. Uses the example "what the camera sees" in the seed data;
 * for outlets without one, it returns the last count and batch at lower confidence.
 */
export class MockShelfReader implements ShelfReader {
  constructor(private delayMs = 900) {}

  async readShelf(input: { outletId: string; skuIds: string[] }): Promise<ShelfReadingItem[]> {
    await wait(this.delayMs);
    const meta = (await db.meta.get('demo'))?.value as DemoMeta | undefined;
    const seen = meta?.photoCounts[input.outletId] ?? {};
    const lines = await db.lines.where('outletId').equals(input.outletId).toArray();
    return input.skuIds.map((skuId) => {
      const s = seen[skuId];
      if (s) return { skuId, stock: s.stock, batch: s.batch, confidence: s.confidence, source: 'mock' as const };
      const l = lines.find((x) => x.skuId === skuId);
      return { skuId, stock: l?.visits.at(-1)?.stock ?? 0, batch: l?.batch, confidence: 0.6, source: 'mock' as const };
    });
  }

  async readBatchCode(input: { outletId: string; skuId: string }) {
    await wait(this.delayMs / 2);
    const line = await db.lines.get(`${input.outletId}:${input.skuId}`);
    return { batch: line?.batch ?? '', confidence: 0.9, source: 'mock' as const };
  }
}
