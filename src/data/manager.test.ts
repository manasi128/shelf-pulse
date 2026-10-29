import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_TODAY as today } from '../config/demo';
import { ensureSeeded, loadDataset, ShelfPulseDB } from './db';
import { flagQueue, kpis, recentDecisions, territory } from './manager';
import { applyCounts, decideFlag, raiseFlag } from './repo';

let db: ShelfPulseDB;
let n = 0;
beforeEach(async () => {
  db = new ShelfPulseDB(`mgr-${n++}`);
  await ensureSeeded(db);
});
afterEach(async () => {
  await db.delete();
});

const state = async () => ({
  data: (await loadDataset(db))!,
  drafts: Object.fromEntries((await db.drafts.toArray()).map((d) => [d.outletId, d])),
});

describe('manager desk', () => {
  it('queues open flags with red first, then nearest deadline', async () => {
    await raiseFlag(db, {
      outletId: 'sharma',
      skuId: 'SERUM',
      status: 'red',
      proposal: { kind: 'route', route: 'salon_backbar', partnerId: 'salon-rang' },
      units: 4,
      unitPrice: 1150,
      actBy: '2026-08-27',
      today,
    });
    const { data, drafts } = await state();
    const q = flagQueue(data, drafts, today);
    const statuses = q.map((i) => i.flag.status);
    expect(statuses).toEqual([...statuses].sort((a, b) => (a === b ? 0 : a === 'red' ? -1 : 1)));
    expect(q[0]).toMatchObject({ outlet: { id: 'lakshmi-medicals' }, daysToDecide: 0 });
    const serum = q.find((i) => i.sku.id === 'SERUM')!;
    expect(serum).toMatchObject({ partnerName: 'Studio Rang Salon (example partner)', value: 4600, daysToDecide: 2 });
    expect(serum.evidence?.evaluation.status).toBe('red');
    // Only moves that need a decision reach the manager: no in-shop playbook steps.
    expect(q.every((i) => i.flag.proposal.kind === 'route')).toBe(true);
  });

  it('demo beat 6: approving moves ₹ saved, units kept and resolved-before-act-by', async () => {
    const id = await raiseFlag(db, {
      outletId: 'sharma',
      skuId: 'LIP',
      status: 'amber',
      proposal: { kind: 'route', route: 'transfer', receiverOutletId: 'fresh-look', runDate: '2026-11-05' },
      units: 9,
      unitPrice: 499,
      actBy: '2027-11-04',
      today,
    });
    const before = kpis((await state()).data, {}, today);
    await decideFlag(db, { flagId: id, decision: 'approved', today });
    const { data } = await state();
    const after = kpis(data, {}, today);
    expect(after.tally.rupeesSaved - before.tally.rupeesSaved).toBeCloseTo(9 * 499);
    expect(after.tally.unitsKeptFromDestruction - before.tally.unitsKeptFromDestruction).toBe(9);
    expect(after.tally.reverseTripsAvoided - before.tally.reverseTripsAvoided).toBe(1);
    expect(after.resolved.resolvedInTime - before.resolved.resolvedInTime).toBe(1);
    expect(recentDecisions(data, today).map((f) => f.id)).toContain(id);
    expect(flagQueue(data, {}, today).some((q) => q.flag.id === id)).toBe(false);
  });

  it('territory flags the sunscreen for category review once Sharma is counted', async () => {
    expect(territory((await state()).data, {}, today).category).toEqual([]);
    await applyCounts(db, { outletId: 'sharma', today, source: 'photo', counts: { SUN: { stock: 23, batch: 'SN4K08' } } });
    const { data, drafts } = await state();
    const t = territory(data, drafts, today);
    expect(t.category.map((c) => [c.sku.id, c.outlets])).toEqual([['SUN', 3]]);
    expect(t.rows[0].outlet.id).toBe('sharma');
  });

  it('KPIs come from the trends and live lines', async () => {
    const k = kpis((await state()).data, {}, today);
    expect(k.returnRatePct).toBe(1.9);
    expect(k.controlReturnRatePct).toBe(2.6);
    expect(k.loadingIndexPts).toBe(-2);
    expect(k.mustSellOsa).toBe(1);
    expect(k.atRisk).toBeGreaterThan(0);
    expect(k.tally.co2Kg).toBeNull();
  });
});
