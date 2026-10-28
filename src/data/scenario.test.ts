/**
 * The judges' demo script, run against the real seed data and logic.
 * If any of these fail, the live demo will not tell the story.
 */
import { describe, expect, it } from 'vitest';
import { DEMO_TODAY } from '../config/demo';
import { skusForCategoryReview } from '../logic';
import seed from './seed.json';
import { expandSeed, type SeedFile } from './expandSeed';
import { orderForOutlet, outletLines, rankToday, type Drafts } from './derive';
import type { VisitDraft } from './schema';

const data = expandSeed(seed as unknown as SeedFile);
const today = DEMO_TODAY;

/** Sharma after the shelf photo: every red-list SKU counted from the mock photo. */
function sharmaCounted(): Drafts {
  const photo = data.meta.photoCounts.sharma;
  const draft: VisitDraft = {
    outletId: 'sharma',
    date: today,
    counts: Object.fromEntries(
      Object.entries(photo).map(([sku, c]) => [sku, { stock: c.stock, batch: c.batch, source: 'photo' as const }]),
    ),
    signals: {},
    answers: {},
    stepsDone: {},
    startedAt: `${today}T10:00:00`,
  };
  return { sharma: draft };
}

const line = (drafts: Drafts, sku: string) => outletLines(data, 'sharma', drafts, today).find((v) => v.sku.id === sku)!;

describe('seed shape', () => {
  it('has one beat of 8 outlets with a 6-SKU red list each', () => {
    expect(data.outlets).toHaveLength(8);
    for (const o of data.outlets) expect(data.lines.filter((l) => l.outletId === o.id)).toHaveLength(6);
  });
});

describe('1. Today: Sharma General Store is first, and we can say why', () => {
  const ranked = rankToday(data, {}, today);
  it('ranks Sharma first although it is third on the usual route', () => {
    expect(ranked[0].outlet.id).toBe('sharma');
    expect(ranked[0].outlet.routeOrder).toBe(3);
  });
  it('gives plain reasons: a red line, act-by already passed, ambers, open flags', () => {
    const codes = ranked[0].reasons.map((r) => r.code);
    expect(codes[0]).toBe('red_lines');
    expect(codes).toEqual(expect.arrayContaining(['act_by_soon', 'amber_lines', 'open_flags']));
  });
});

describe('2–3. Shelf photo pre-fills the count; the sunscreen turns red, the serum goes to a salon', () => {
  it('sunscreen is amber before the count', () => {
    expect(line({}, 'SUN').evaluation.status).toBe('amber');
  });
  it('after the photo count (6 billed since, none sold) the sunscreen is red and transferred', () => {
    const sun = line(sharmaCounted(), 'SUN');
    expect(sun.counted).toBe(true);
    expect(sun.evaluation.salesSinceLast).toBe(0);
    expect(sun.evaluation.signals).toContain('same_batch_no_sales');
    expect(sun.evaluation.status).toBe('red');
    expect(sun.ladder?.chosen).toBe('transfer');
    expect(sun.receiver?.outletId).toBe('glow-beauty');
    expect(sun.ladder?.stopShippingBatch).toBe(true);
  });
  it('the professional serum is red and routed to the salon back-bar', () => {
    const serum = line(sharmaCounted(), 'SERUM');
    expect(serum.evaluation.status).toBe('red');
    expect(serum.ladder?.chosen).toBe('salon_backbar');
  });
});

describe("4. The lipstick goes to a matched outlet on Thursday's run", () => {
  const lip = line(sharmaCounted(), 'LIP');
  it('is amber (slow, not near expiry) with the move step unlocked after 2 visits', () => {
    expect(lip.evaluation.status).toBe('amber');
    expect(lip.playbook?.find((s) => s.state === 'next')?.step).toBe('move');
  });
  it('matches Fresh Look Cosmetics on the Thursday 5 Nov delivery run', () => {
    expect(lip.receiver).toMatchObject({ outletId: 'fresh-look', nextRunDate: '2026-11-05' });
    expect(lip.transfer?.ok).toBe(true);
    expect(lip.transfer?.incentiveEligible).toBe(true);
  });
});

describe('5. The order keeps its value with zero slow stock', () => {
  const order = orderForOutlet(data, 'sharma', sharmaCounted(), today);
  it('adds no amber or red stock', () => {
    expect(order.slowStockAdded).toBe(0);
    for (const sku of ['SUN', 'SERUM', 'LIP', 'GIFT']) {
      expect(order.lines.find((l) => l.skuId === sku)?.qty).toBe(0);
    }
  });
  it('keeps at least the usual order value via fast sellers and range gaps', () => {
    expect(order.valueKeptRatio).toBeGreaterThanOrEqual(1);
    expect(order.lines.filter((l) => l.reason === 'range_gap').map((l) => l.skuId)).toEqual(['KAJAL', 'MICELLAR']);
  });
});

describe('Manager desk', () => {
  it('has open flags to decide and resolved history for the tallies', () => {
    expect(data.flags.filter((f) => f.state === 'open').length).toBeGreaterThanOrEqual(4);
    expect(data.resolutions.length).toBeGreaterThanOrEqual(8);
  });
  it('sunscreen becomes red in 3 outlets after the Sharma count → category review', () => {
    const all = (drafts: Drafts) =>
      data.outlets.flatMap((o) =>
        outletLines(data, o.id, drafts, today).map((v) => ({ skuId: v.sku.id, outletId: o.id, status: v.evaluation.status })),
      );
    expect(skusForCategoryReview(all({}))).toEqual([]);
    expect(skusForCategoryReview(all(sharmaCounted()))).toEqual(['SUN']);
  });
});
