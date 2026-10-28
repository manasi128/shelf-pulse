/**
 * Sync queue. Writes land in the local store first and are queued in `outbox`;
 * this engine sends pending ops whenever the device is online.
 *
 * In mock mode the transport just acknowledges after a short delay. A real backend
 * plugs in by implementing SyncTransport; nothing else changes.
 */
import type { OutboxOp, ShelfPulseDB } from './db';

export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

export interface SyncTransport {
  send(ops: OutboxOp[]): Promise<void>;
}

export class MockTransport implements SyncTransport {
  constructor(
    private isOnline: () => boolean | Promise<boolean>,
    private delayMs = 250,
  ) {}
  async send(_ops: OutboxOp[]): Promise<void> {
    if (!(await this.isOnline())) throw new OfflineError();
    await new Promise((r) => setTimeout(r, this.delayMs));
  }
}

/** Online = the browser says so AND the demo "simulate offline" switch is off. */
export function deviceOnline(db: ShelfPulseDB) {
  return async () => {
    const force = await db.meta.get('forceOffline');
    return (typeof navigator === 'undefined' || navigator.onLine !== false) && force?.value !== true;
  };
}

let running: Promise<{ sent: number; failed: number }> | null = null;

/** Send all pending ops in one batch. Safe to call repeatedly; concurrent calls share one run. */
export function syncNow(db: ShelfPulseDB, transport: SyncTransport, batchSize = 50) {
  running ??= (async () => {
    try {
      const pending = await db.outbox.where('status').equals('pending').limit(batchSize).toArray();
      if (!pending.length) return { sent: 0, failed: 0 };
      try {
        await transport.send(pending);
        const syncedAt = new Date().toISOString();
        await db.outbox.bulkUpdate(pending.map((op) => ({ key: op.id!, changes: { status: 'synced' as const, syncedAt } })));
        return { sent: pending.length, failed: 0 };
      } catch (e) {
        const msg = e instanceof OfflineError ? 'offline' : String(e);
        await db.outbox.bulkUpdate(
          pending.map((op) => ({ key: op.id!, changes: { attempts: op.attempts + 1, lastError: msg } })),
        );
        return { sent: 0, failed: pending.length };
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Sync on start, when the network returns, and on an interval. Returns a stop function. */
export function startAutoSync(db: ShelfPulseDB, transport: SyncTransport, intervalMs = 15_000) {
  const tick = () => void syncNow(db, transport);
  tick();
  const timer = setInterval(tick, intervalMs);
  window.addEventListener('online', tick);
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', tick);
  };
}
