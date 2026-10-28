import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import mr from '../i18n/locales/mr.json';
import ta from '../i18n/locales/ta.json';
import bn from '../i18n/locales/bn.json';
import { extractByKeywords } from './mock/voice';
import { getAi } from './index';
import type { NextActionInput } from './types';

const redList = ['SUN', 'SERUM', 'LIP', 'GIFT', 'FACEWASH', 'SHAMPOO'].map((skuId) => ({ skuId, brand: '', name: skuId }));
const offList = ['KAJAL', 'MICELLAR', 'TINT'].map((skuId) => ({ skuId, brand: '', name: skuId }));

describe('offline voice extraction', () => {
  it.each([
    ['en', en],
    ['hi', hi],
    ['mr', mr],
    ['ta', ta],
    ['bn', bn],
  ])('reads the %s sample note into signals and a range ask', (_lang, locale) => {
    const r = extractByKeywords({ transcript: locale.voice.sample, redList, offList });
    expect(r.signals.map((s) => [s.skuId, s.signal])).toEqual([
      ['SUN', 'backroom_cartons'],
      ['LIP', 'discount_ask'],
    ]);
    expect(r.rangeAsks.map((a) => a.skuId)).toEqual(['KAJAL']);
    expect(r.signals.every((s) => s.quote.length > 0 && s.confidence > 0)).toBe(true);
  });
  it('finds nothing in an unrelated note', () => {
    const r = extractByKeywords({ transcript: 'All good today, shop was busy.', redList, offList });
    expect(r).toEqual({ signals: [], rangeAsks: [] });
  });
});

const input: NextActionInput = {
  language: 'en',
  product: 'Garnier Sunscreen',
  status: 'red',
  facts: [],
  candidates: [
    { id: 'transfer', label: 'Move', isRuleChoice: true },
    { id: 'staff_sale', label: 'Staff sale', isRuleChoice: false },
  ],
  ruleWhy: 'Glow sells it every visit.',
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

afterEach(() => vi.unstubAllGlobals());

describe('modes', () => {
  it('off and demo modes use the rules for next action and messages', async () => {
    for (const mode of ['off', 'mock'] as const) {
      const ai = getAi(mode);
      expect(await ai.advisor.nextAction(input)).toEqual({ choice: 'transfer', why: input.ruleWhy, confidence: 1, source: 'rules' });
    }
    expect(getAi('off').shelf).toBeNull();
    expect(getAi('off').voice).toBeNull();
  });
});

describe('live mode: AI suggests, but only from the playbook', () => {
  it('accepts a valid choice with its why', async () => {
    vi.stubGlobal('fetch', fakeFetch(200, { choice: 'staff_sale', why: 'Too few days for a transfer run.', confidence: 0.7 }));
    expect(await getAi('live').advisor.nextAction(input)).toEqual({
      choice: 'staff_sale',
      why: 'Too few days for a transfer run.',
      confidence: 0.7,
      source: 'live',
    });
  });
  it('rejects an invented action and falls back to the rules', async () => {
    vi.stubGlobal('fetch', fakeFetch(200, { choice: 'discount_50_percent', why: 'Sell it cheap.', confidence: 0.9 }));
    expect((await getAi('live').advisor.nextAction(input)).choice).toBe('transfer');
  });
  it('falls back when the server has no key or the network is down', async () => {
    vi.stubGlobal('fetch', fakeFetch(503, { error: 'no_key' }));
    expect((await getAi('live').advisor.nextAction(input)).source).toBe('rules');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const msg = await getAi('live').writer.retailerMessage({
      language: 'hi',
      shop: 'Sharma',
      repName: 'Rahul',
      orderItems: [],
      templateText: 'template',
    });
    expect(msg).toEqual({ text: 'template', source: 'rules' });
  });
  it('drops voice suggestions for products or signals outside the lists', async () => {
    vi.stubGlobal(
      'fetch',
      fakeFetch(200, {
        signals: [
          { skuId: 'SUN', signal: 'backroom_cartons', quote: 'two cartons', confidence: 2 },
          { skuId: 'NOT_A_SKU', signal: 'dust_faded', quote: 'x', confidence: 0.5 },
          { skuId: 'LIP', signal: 'make_it_free', quote: 'x', confidence: 0.5 },
        ],
        rangeAsks: [{ skuId: 'KAJAL', quote: 'kajal', confidence: 0.6 }],
      }),
    );
    const r = await getAi('live').voice!.extract({ transcript: 'x', language: 'en', redList, offList });
    expect(r.signals).toEqual([{ skuId: 'SUN', signal: 'backroom_cartons', quote: 'two cartons', confidence: 1 }]);
    expect(r.rangeAsks.map((a) => a.skuId)).toEqual(['KAJAL']);
    expect(r.source).toBe('live');
  });
});
