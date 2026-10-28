import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_TODAY as today } from '../config/demo';
import { sustainabilityTally } from '../logic';
import { ensureSeeded, loadDataset, loadSeed, ShelfPulseDB } from './db';
import { outletLines } from './derive';
import { applyCounts, decideFlag, raiseFlag, setCount, setForceOffline, toggleSignal } from './repo';
import { deviceOnline, MockTransport, syncNow } from './sync';

let db: ShelfPulseDB;
let n = 0;

beforeEach(async () => {
  db = new ShelfPulseDB(`test-${n++}`);
  await ensureSeeded(db);
});
afterEach(async () => {
  await db.delete();
});

const drafts = async () => Object.fromEntries((await db.drafts.toArray()).map((d) => [d.outletId, d]));
const sunAtSharma = async () => {
  const data = (await loadDataset(db))!;
  return outletLines(data, 'sharma', await drafts(), today).find((v) => v.sku.id === 'SUN')!;
};

describe('seeding', () => {
  it('loads the example data once', async () => {
    const data = await loadDataset(db);
    expect(data?.outlets).toHaveLength(8);
    await db.flags.clear();
    await ensureSeeded(db); // same version: does not reload
    expect(await db.flags.count()).toBe(0);
  });
  it('reset restores the demo', async () => {
    await db.flags.clear();
    await loadSeed(db);
    expect(await db.flags.count()).toBeGreaterThan(0);
    expect(await db.outbox.count()).toBe(0);
  });
});

describe('counting', () => {
  it('a stored count updates status straight away', async () => {
    expect((await sunAtSharma()).evaluation.status).toBe('amber');
    await setCount(db, { outletId: 'sharma', skuId: 'SUN', stock: 23, source: 'manual', batch: 'SN4K08', today });
    expect((await sunAtSharma()).evaluation.status).toBe('red');
    await setCount(db, { outletId: 'sharma', skuId: 'SUN', stock: 10, source: 'manual', today });
    const sun = await sunAtSharma();
    expect(sun.evaluation.salesSinceLast).toBe(13);
    expect(sun.batchNow).toBe('SN4K08'); // keeps the batch already noted
  });
  it('photo counts pre-fill many lines in one go', async () => {
    await applyCounts(db, { outletId: 'sharma', today, source: 'photo', counts: { SUN: { stock: 23, batch: 'SN4K08' }, LIP: { stock: 9 } } });
    const d = await db.drafts.get('sharma');
    expect(d?.counts.SUN).toEqual({ stock: 23, batch: 'SN4K08', source: 'photo' });
    expect(Object.keys(d!.counts)).toEqual(['SUN', 'LIP']);
  });
  it('signals toggle on and off', async () => {
    await toggleSignal(db, { outletId: 'sharma', skuId: 'LIP', signal: 'dust_faded', today });
    await toggleSignal(db, { outletId: 'sharma', skuId: 'LIP', signal: 'discount_ask', today });
    await toggleSignal(db, { outletId: 'sharma', skuId: 'LIP', signal: 'dust_faded', today });
    expect((await db.drafts.get('sharma'))?.signals.LIP).toEqual(['discount_ask']);
  });
});

describe('flags and the manager desk', () => {
  const salonFlag = {
    outletId: 'sharma',
    skuId: 'SERUM',
    status: 'red' as const,
    proposal: { kind: 'route' as const, route: 'salon_backbar' as const, partnerId: 'salon-rang' },
    units: 4,
    unitPrice: 1150,
    actBy: '2026-08-27',
    today,
  };

  it('a red flag must be decided within 48 hours, and is not duplicated', async () => {
    const id = await raiseFlag(db, salonFlag);
    await raiseFlag(db, { ...salonFlag, units: 5 });
    const open = (await db.flags.where({ outletId: 'sharma' }).toArray()).filter((f) => f.skuId === 'SERUM' && f.state === 'open');
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ id, units: 5, decideBy: '2026-11-04' });
  });

  it('approving a route moves the waste and sustainability tallies', async () => {
    const before = sustainabilityTally((await loadDataset(db))!.resolutions);
    const id = await raiseFlag(db, salonFlag);
    await decideFlag(db, { flagId: id, decision: 'approved', today });
    const after = sustainabilityTally((await loadDataset(db))!.resolutions);
    expect(after.unitsKeptFromDestruction - before.unitsKeptFromDestruction).toBe(4);
    expect(after.rupeesSaved - before.rupeesSaved).toBeCloseTo(4 * 1150 * 0.6);
    expect((await db.flags.get(id))?.state).toBe('approved');
  });

  it('declining changes no tally, and a decided flag cannot be decided again', async () => {
    const id = await raiseFlag(db, salonFlag);
    const count = await db.resolutions.count();
    await decideFlag(db, { flagId: id, decision: 'declined', today });
    await decideFlag(db, { flagId: id, decision: 'approved', today });
    expect(await db.resolutions.count()).toBe(count);
    expect((await db.flags.get(id))?.state).toBe('declined');
  });
});

describe('sync queue', () => {
  it('queues every write and sends it when online', async () => {
    await setCount(db, { outletId: 'sharma', skuId: 'SUN', stock: 23, source: 'manual', today });
    expect(await db.outbox.where('status').equals('pending').count()).toBe(2); // visit.start + count.set
    const r = await syncNow(db, new MockTransport(deviceOnline(db), 0));
    expect(r).toEqual({ sent: 2, failed: 0 });
    expect(await db.outbox.where('status').equals('pending').count()).toBe(0);
  });

  it('keeps ops safely while offline, then sends them when back online', async () => {
    await setForceOffline(db, true);
    await setCount(db, { outletId: 'sharma', skuId: 'LIP', stock: 9, source: 'manual', today });
    const transport = new MockTransport(deviceOnline(db), 0);
    expect(await syncNow(db, transport)).toEqual({ sent: 0, failed: 2 });
    const pending = await db.outbox.where('status').equals('pending').toArray();
    expect(pending.every((p) => p.attempts === 1 && p.lastError === 'offline')).toBe(true);
    // The count itself is already saved locally while offline.
    expect((await db.drafts.get('sharma'))?.counts.LIP.stock).toBe(9);

    await setForceOffline(db, false);
    expect(await syncNow(db, transport)).toEqual({ sent: 2, failed: 0 });
  });
});
