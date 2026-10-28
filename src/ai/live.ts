/**
 * Browser side of the live AI route. Calls /api/ai/* (the key stays on the server).
 * Results are validated here: anything malformed or outside the allowed choices is
 * rejected, and the caller falls back to the offline implementation.
 */
import type {
  Advisor,
  NextAction,
  NextActionInput,
  RetailerMessageInput,
  ShelfReader,
  ShelfReadingItem,
  VoiceExtraction,
  VoiceExtractor,
  WeeklySummaryInput,
  Writer,
} from './types';
import { MANUAL_SIGNALS } from '../logic/signals';
import type { SignalId } from '../logic/types';
import { db } from '../data/db';

export class LiveAiError extends Error {}

async function post<T>(feature: string, body: unknown, timeoutMs = 30_000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`/api/ai/${feature}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) throw new LiveAiError(`${feature}: ${r.status}`);
    return (await r.json()) as T;
  } catch (e) {
    throw e instanceof LiveAiError ? e : new LiveAiError(`${feature}: network`);
  } finally {
    clearTimeout(timer);
  }
}

const clamp01 = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);
const text = (s: unknown, max = 2000) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null);

async function toBase64(image: Blob): Promise<{ imageBase64: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
  return { imageBase64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: image.type || 'image/jpeg' };
}

export class LiveShelfReader implements ShelfReader {
  async readShelf(input: { outletId: string; image?: Blob; skuIds: string[] }): Promise<ShelfReadingItem[]> {
    if (!input.image) throw new LiveAiError('no image');
    const skus = await db.skus.bulkGet(input.skuIds);
    const lines = await db.lines.where('outletId').equals(input.outletId).toArray();
    const r = await post<{ items?: unknown[] }>('shelf', {
      ...(await toBase64(input.image)),
      skus: skus.filter(Boolean).map((s) => ({
        skuId: s!.id,
        brand: s!.brand,
        name: s!.name,
        lastBatch: lines.find((l) => l.skuId === s!.id)?.batch,
      })),
    });
    const allowed = new Set(input.skuIds);
    return (r.items ?? [])
      .map((x) => x as Partial<ShelfReadingItem>)
      .filter((x) => typeof x.skuId === 'string' && allowed.has(x.skuId) && Number.isInteger(x.stock) && x.stock! >= 0)
      .map((x) => ({ skuId: x.skuId!, stock: x.stock!, batch: text(x.batch, 40) ?? undefined, confidence: clamp01(x.confidence), source: 'live' as const }));
  }

  async readBatchCode(input: { outletId: string; skuId: string; image?: Blob }) {
    if (!input.image) throw new LiveAiError('no image');
    const sku = await db.skus.get(input.skuId);
    const r = await post<{ batch?: unknown; confidence?: unknown }>('batch', {
      ...(await toBase64(input.image)),
      product: sku ? `${sku.brand} ${sku.name}` : input.skuId,
    });
    const batch = text(r.batch, 40);
    if (!batch) throw new LiveAiError('batch unreadable');
    return { batch, confidence: clamp01(r.confidence), source: 'live' as const };
  }
}

export class LiveVoiceExtractor implements VoiceExtractor {
  async extract(input: Parameters<VoiceExtractor['extract']>[0]): Promise<VoiceExtraction> {
    const r = await post<{ signals?: unknown[]; rangeAsks?: unknown[] }>('voice', input);
    const red = new Set(input.redList.map((s) => s.skuId));
    const off = new Set(input.offList.map((s) => s.skuId));
    const signals = (r.signals ?? [])
      .map((x) => x as { skuId?: string; signal?: string; quote?: unknown; confidence?: unknown })
      .filter((x) => x.skuId && red.has(x.skuId) && (MANUAL_SIGNALS as readonly string[]).includes(x.signal ?? ''))
      .map((x) => ({ skuId: x.skuId!, signal: x.signal as SignalId, quote: text(x.quote, 300) ?? '', confidence: clamp01(x.confidence) }));
    const rangeAsks = (r.rangeAsks ?? [])
      .map((x) => x as { skuId?: string; quote?: unknown; confidence?: unknown })
      .filter((x) => x.skuId && off.has(x.skuId))
      .map((x) => ({ skuId: x.skuId!, quote: text(x.quote, 300) ?? '', confidence: clamp01(x.confidence) }));
    return { signals, rangeAsks, source: 'live' };
  }
}

export class LiveAdvisor implements Advisor {
  async nextAction(input: NextActionInput): Promise<NextAction> {
    const r = await post<{ choice?: unknown; why?: unknown; confidence?: unknown }>('next-action', input);
    const why = text(r.why, 240);
    if (typeof r.choice !== 'string' || !input.candidates.some((c) => c.id === r.choice) || !why) {
      throw new LiveAiError('next-action: outside the playbook');
    }
    return { choice: r.choice, why, confidence: clamp01(r.confidence), source: 'live' };
  }
}

export class LiveWriter implements Writer {
  async retailerMessage(input: RetailerMessageInput) {
    const { templateText: _template, ...facts } = input;
    const r = await post<{ message?: unknown }>('retailer-message', facts);
    const t = text(r.message, 1500);
    if (!t) throw new LiveAiError('retailer-message: empty');
    return { text: t, source: 'live' as const };
  }
  async weeklySummary(input: WeeklySummaryInput) {
    const { templateText: _template, ...facts } = input;
    const r = await post<{ summary?: unknown }>('weekly-summary', facts);
    const t = text(r.summary, 1500);
    if (!t) throw new LiveAiError('weekly-summary: empty');
    return { text: t, source: 'live' as const };
  }
}
