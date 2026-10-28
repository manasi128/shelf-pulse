import Dexie, { type Table } from 'dexie';
import seed from './seed.json';
import { expandSeed, type SeedFile } from './expandSeed';
import type {
  Dataset,
  DemoMeta,
  Flag,
  GodownBatch,
  Outlet,
  Partner,
  ResolutionRecord,
  Sku,
  StockLine,
  Trends,
  VisitDraft,
} from './schema';

export type OutboxKind =
  | 'visit.start'
  | 'count.set'
  | 'signal.toggle'
  | 'step.done'
  | 'answers.set'
  | 'visit.complete'
  | 'flag.raise'
  | 'flag.decide';

export interface OutboxOp {
  id?: number;
  kind: OutboxKind;
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'synced';
  attempts: number;
  lastError?: string;
  syncedAt?: string;
}

interface MetaRow {
  key: string;
  value: unknown;
}

/** Offline store (IndexedDB). Shared by the rep app and the manager desk on the same device. */
export class ShelfPulseDB extends Dexie {
  meta!: Table<MetaRow, string>;
  skus!: Table<Sku, string>;
  outlets!: Table<Outlet, string>;
  lines!: Table<StockLine, string>;
  drafts!: Table<VisitDraft, string>;
  flags!: Table<Flag, string>;
  resolutions!: Table<ResolutionRecord, string>;
  partners!: Table<Partner, string>;
  godown!: Table<GodownBatch, string>;
  outbox!: Table<OutboxOp, number>;

  constructor(name = 'shelf-pulse') {
    super(name);
    this.version(1).stores({
      meta: 'key',
      skus: 'id',
      outlets: 'id, routeOrder',
      lines: 'id, outletId, skuId',
      drafts: 'outletId',
      flags: 'id, outletId, state',
      resolutions: 'id, flagId, date',
      partners: 'id',
      godown: 'id',
      outbox: '++id, status',
    });
  }
}

export const SEED_VERSION = (seed as { version: number }).version;

/** Wipe everything and load the example data. */
export async function loadSeed(db: ShelfPulseDB): Promise<void> {
  const data = expandSeed(seed as unknown as SeedFile);
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.skus.bulkAdd(data.skus);
    await db.outlets.bulkAdd(data.outlets);
    await db.lines.bulkAdd(data.lines);
    await db.flags.bulkAdd(data.flags);
    await db.resolutions.bulkAdd(data.resolutions);
    await db.partners.bulkAdd(data.partners);
    await db.godown.bulkAdd(data.godown);
    await db.meta.bulkPut([
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'trends', value: data.trends },
      { key: 'demo', value: data.meta },
      { key: 'forceOffline', value: false },
    ]);
  });
}

/** Load the seed on first run, or when the seed file has changed. */
export async function ensureSeeded(db: ShelfPulseDB): Promise<void> {
  const v = await db.meta.get('seedVersion');
  if (v?.value !== SEED_VERSION) await loadSeed(db);
}

export async function loadDataset(db: ShelfPulseDB): Promise<Dataset | undefined> {
  const [skus, outlets, lines, flags, resolutions, partners, godown, trends, meta] = await Promise.all([
    db.skus.toArray(),
    db.outlets.orderBy('routeOrder').toArray(),
    db.lines.toArray(),
    db.flags.toArray(),
    db.resolutions.toArray(),
    db.partners.toArray(),
    db.godown.toArray(),
    db.meta.get('trends'),
    db.meta.get('demo'),
  ]);
  if (!skus.length || !trends || !meta) return undefined;
  skus.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
  return {
    skus,
    outlets,
    lines,
    flags,
    resolutions,
    partners,
    godown,
    trends: trends.value as Trends,
    meta: meta.value as DemoMeta,
  };
}

export const db = new ShelfPulseDB();
