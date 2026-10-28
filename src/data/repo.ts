/**
 * Every change the app makes. Each write updates the local store AND queues an outbox op
 * in the same transaction, so nothing is lost offline.
 */
import { addDays, escalate, type AmberStep, type ISODate, type SignalId } from '../logic';
import type { ShelfPulseDB, OutboxKind } from './db';
import type { Flag, VisitDraft } from './schema';

function now() {
  return new Date().toISOString();
}

async function enqueue(db: ShelfPulseDB, kind: OutboxKind, payload: unknown) {
  await db.outbox.add({ kind, payload, createdAt: now(), status: 'pending', attempts: 0 });
}

async function getOrStartDraft(db: ShelfPulseDB, outletId: string, today: ISODate): Promise<VisitDraft> {
  const existing = await db.drafts.get(outletId);
  if (existing) return existing;
  const draft: VisitDraft = { outletId, date: today, counts: {}, signals: {}, answers: {}, stepsDone: {}, startedAt: now() };
  await db.drafts.put(draft);
  await enqueue(db, 'visit.start', { outletId, date: today });
  return draft;
}

export async function setCount(
  db: ShelfPulseDB,
  args: { outletId: string; skuId: string; stock: number; source: 'photo' | 'scan' | 'manual'; batch?: string; today: ISODate },
) {
  const stock = Math.max(0, Math.round(args.stock));
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    const prev = d.counts[args.skuId];
    d.counts[args.skuId] = { stock, source: args.source, batch: args.batch ?? prev?.batch };
    await db.drafts.put(d);
    await enqueue(db, 'count.set', { outletId: args.outletId, skuId: args.skuId, stock, source: args.source, batch: d.counts[args.skuId].batch });
  });
}

/** Pre-fill several counts at once (shelf photo). The rep confirms or adjusts each. */
export async function applyCounts(
  db: ShelfPulseDB,
  args: { outletId: string; today: ISODate; source: 'photo' | 'scan'; counts: Record<string, { stock: number; batch?: string }> },
) {
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    for (const [skuId, c] of Object.entries(args.counts)) {
      d.counts[skuId] = { stock: Math.max(0, Math.round(c.stock)), batch: c.batch, source: args.source };
    }
    await db.drafts.put(d);
    await enqueue(db, 'count.set', { outletId: args.outletId, source: args.source, counts: args.counts });
  });
}

export async function toggleSignal(db: ShelfPulseDB, args: { outletId: string; skuId: string; signal: SignalId; today: ISODate }) {
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    const set = new Set(d.signals[args.skuId] ?? []);
    if (set.has(args.signal)) set.delete(args.signal);
    else set.add(args.signal);
    d.signals[args.skuId] = [...set];
    await db.drafts.put(d);
    await enqueue(db, 'signal.toggle', { outletId: args.outletId, skuId: args.skuId, signals: d.signals[args.skuId] });
  });
}

export async function markStepDone(db: ShelfPulseDB, args: { outletId: string; skuId: string; step: AmberStep; today: ISODate }) {
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    const steps = new Set(d.stepsDone[args.skuId] ?? []);
    steps.add(args.step);
    d.stepsDone[args.skuId] = [...steps];
    await db.drafts.put(d);
    await enqueue(db, 'step.done', { outletId: args.outletId, skuId: args.skuId, step: args.step });
  });
}

export async function setAnswers(db: ShelfPulseDB, args: { outletId: string; today: ISODate; answers: VisitDraft['answers'] }) {
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    d.answers = { ...d.answers, ...args.answers };
    await db.drafts.put(d);
    await enqueue(db, 'answers.set', { outletId: args.outletId, answers: d.answers });
  });
}

export async function completeVisit(db: ShelfPulseDB, args: { outletId: string; today: ISODate }) {
  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const d = await getOrStartDraft(db, args.outletId, args.today);
    d.completedAt = now();
    await db.drafts.put(d);
    await enqueue(db, 'visit.complete', { outletId: args.outletId, completedAt: d.completedAt });
  });
}

/**
 * Raise a flag for the area manager. Replaces any open flag for the same outlet and SKU,
 * so re-tapping never creates duplicates. Decide-by follows the escalation rules.
 */
export async function raiseFlag(
  db: ShelfPulseDB,
  args: Pick<Flag, 'outletId' | 'skuId' | 'status' | 'proposal' | 'units' | 'unitPrice' | 'actBy'> & { today: ISODate },
): Promise<string> {
  const { today, ...f } = args;
  const id = `f-${f.outletId}-${f.skuId}-${today}`;
  const hours = escalate(f.status).decideWithinHours;
  const flag: Flag = {
    ...f,
    id,
    raisedOn: today,
    decideBy: addDays(today, Math.ceil(hours / 24)),
    state: 'open',
  };
  await db.transaction('rw', db.flags, db.outbox, async () => {
    const existing = await db.flags.where({ outletId: f.outletId }).filter((x) => x.skuId === f.skuId && x.state === 'open').toArray();
    await db.flags.bulkDelete(existing.map((x) => x.id));
    await db.flags.put(flag);
    await enqueue(db, 'flag.raise', flag);
  });
  return id;
}

/**
 * Manager decision. Approving a recovery route records it as resolved, which moves the
 * waste and sustainability tallies. Approving a playbook step just confirms it.
 */
export async function decideFlag(db: ShelfPulseDB, args: { flagId: string; decision: 'approved' | 'declined'; today: ISODate; note?: string }) {
  await db.transaction('rw', [db.flags, db.resolutions, db.skus, db.outbox], async () => {
    const flag = await db.flags.get(args.flagId);
    if (!flag || flag.state !== 'open') return;
    flag.state = args.decision;
    flag.decidedOn = args.today;
    if (args.note) flag.note = args.note;
    if (args.decision === 'approved' && flag.proposal.kind === 'route') {
      flag.resolvedOn = args.today;
      const sku = await db.skus.get(flag.skuId);
      await db.resolutions.put({
        id: `r-${flag.id}`,
        flagId: flag.id,
        outletId: flag.outletId,
        skuId: flag.skuId,
        route: flag.proposal.route,
        units: flag.units,
        unitPrice: flag.unitPrice,
        packagingGrams: sku?.packagingGrams ?? 0,
        date: args.today,
      });
    }
    await db.flags.put(flag);
    await enqueue(db, 'flag.decide', { flagId: flag.id, decision: args.decision, note: args.note });
  });
}

export async function setForceOffline(db: ShelfPulseDB, value: boolean) {
  await db.meta.put({ key: 'forceOffline', value });
}

export async function setGodownChecked(db: ShelfPulseDB, args: { batchId: string; checked: boolean; today: ISODate }) {
  const row = await db.meta.get('godownChecked');
  const map = { ...((row?.value as Record<string, ISODate>) ?? {}) };
  if (args.checked) map[args.batchId] = args.today;
  else delete map[args.batchId];
  await db.meta.put({ key: 'godownChecked', value: map });
}
