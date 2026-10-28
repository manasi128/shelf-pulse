import { useLiveQuery } from 'dexie-react-hooks';
import { db, loadDataset } from './db';
import type { Drafts } from './derive';

/** Whole dataset, live: re-renders on any change, in this tab or another. */
export function useDataset() {
  return useLiveQuery(() => loadDataset(db), []);
}

export function useDrafts(): Drafts | undefined {
  return useLiveQuery(async () => Object.fromEntries((await db.drafts.toArray()).map((d) => [d.outletId, d])), []);
}

export function useSyncState() {
  return useLiveQuery(async () => {
    const [pending, synced, force] = await Promise.all([
      db.outbox.where('status').equals('pending').toArray(),
      db.outbox.where('status').equals('synced').count(),
      db.meta.get('forceOffline'),
    ]);
    return {
      pending: pending.length,
      synced,
      lastError: pending.find((p) => p.lastError)?.lastError,
      forceOffline: force?.value === true,
    };
  }, []);
}

export function useGodownChecked(): Record<string, string> | undefined {
  return useLiveQuery(async () => ((await db.meta.get('godownChecked'))?.value as Record<string, string>) ?? {}, []);
}
