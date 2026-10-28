/**
 * Optional live AI route, mounted on the Vite dev and preview servers at /api/ai/*.
 * The API key is read from the server environment (.env, ANTHROPIC_API_KEY) and never
 * reaches the browser. Without a key, /api/ai/status reports unavailable and the app
 * stays in its offline mock mode.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const SIGNALS = ['dust_faded', 'backroom_cartons', 'no_facing', 'discount_ask', 'damaged_pack'];

const SYSTEM = [
  'You support field sales reps and area managers in Indian general trade (kiranas, cosmetic shops, chemists)',
  'in a concept prototype for the L\'Oréal Sustainability Challenge. The goal is to spot slow or ageing stock early',
  'and route it before it becomes waste, without cutting orders or pushing discounts.',
  'Use only the facts you are given. Never invent products, quantities, prices, dates or actions.',
  'Write plainly and kindly; never use blame language. Never suggest unlabelled discounting.',
].join(' ');

type Json = Record<string, unknown>;

interface FeatureSpec {
  effort: 'low' | 'medium';
  schema: (input: Json) => Json;
  prompt: (input: Json) => Anthropic.Beta.BetaContentBlockParam[];
}

const obj = (properties: Json, required = Object.keys(properties)): Json => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const enumOrString = (values: unknown) =>
  Array.isArray(values) && values.length ? { type: 'string', enum: values } : { type: 'string' };
const ids = (list: unknown) => (Array.isArray(list) ? list.map((s) => (s as { skuId: string }).skuId) : []);

function image(input: Json): Anthropic.Beta.BetaContentBlockParam {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: input.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
      data: input.imageBase64 as string,
    },
  };
}

const FEATURES: Record<string, FeatureSpec> = {
  shelf: {
    effort: 'medium',
    schema: (i) =>
      obj({
        items: {
          type: 'array',
          items: obj({
            skuId: enumOrString(ids(i.skus)),
            stock: { type: 'integer' },
            batch: { type: 'string' },
            confidence: { type: 'number' },
          }),
        },
      }),
    prompt: (i) => [
      image(i),
      {
        type: 'text',
        text:
          'Count the units (facings plus visible stock) of each listed product on this shelf and read its batch code ' +
          'if legible (empty string if not). Only report listed products. Confidence is 0 to 1.\n' +
          JSON.stringify({ products: i.skus }),
      },
    ],
  },
  batch: {
    effort: 'low',
    schema: () => obj({ batch: { type: 'string' }, confidence: { type: 'number' } }),
    prompt: (i) => [
      image(i),
      { type: 'text', text: `Read the printed batch code on this pack of ${String(i.product)}. Empty string if not legible.` },
    ],
  },
  voice: {
    effort: 'low',
    schema: (i) =>
      obj({
        signals: {
          type: 'array',
          items: obj({
            skuId: enumOrString(ids(i.redList)),
            signal: { type: 'string', enum: SIGNALS },
            quote: { type: 'string' },
            confidence: { type: 'number' },
          }),
        },
        rangeAsks: {
          type: 'array',
          items: obj({ skuId: enumOrString(ids(i.offList)), quote: { type: 'string' }, confidence: { type: 'number' } }),
        },
      }),
    prompt: (i) => [
      {
        type: 'text',
        text:
          'A sales rep recorded this note in a shop (it may be in Hindi, Marathi, Tamil, Bengali or English, often mixed). ' +
          'Extract shelf signals for the red-list products, and products the retailer asked for from the off-list. ' +
          'Signals: dust_faded, backroom_cartons (unopened cartons in the backroom), no_facing (pushed back or not visible), ' +
          'discount_ask (retailer asked for a discount), damaged_pack. Quote the words you relied on. Confidence 0 to 1. ' +
          'Return empty arrays if nothing applies.\n' +
          JSON.stringify({ transcript: i.transcript, redList: i.redList, offList: i.offList }),
      },
    ],
  },
  'next-action': {
    effort: 'low',
    schema: (i) =>
      obj({
        choice: enumOrString(ids((i.candidates as { id: string }[]).map((c) => ({ skuId: c.id })))),
        why: { type: 'string' },
        confidence: { type: 'number' },
      }),
    prompt: (i) => [
      {
        type: 'text',
        text:
          `Choose the next action for this ${String(i.status)} product from the candidates ONLY. The candidate marked ` +
          'isRuleChoice is what the playbook rules pick; keep it unless a fact clearly favours another candidate. ' +
          `Then write ONE short sentence (max 25 words) in language "${String(i.language)}" saying why, in plain words a ` +
          'shop-floor sales rep would use. Confidence 0 to 1.\n' +
          JSON.stringify({ product: i.product, facts: i.facts, candidates: i.candidates }),
      },
    ],
  },
  'retailer-message': {
    effort: 'low',
    schema: () => obj({ message: { type: 'string' } }),
    prompt: (i) => [
      {
        type: 'text',
        text:
          `Write a short, warm WhatsApp message from the sales rep to the shopkeeper in language "${String(i.language)}" ` +
          '(Hindi: hi, Marathi: mr, Tamil: ta, Bengali: bn, English: en). Keep product names exactly as given. List the ' +
          'order items one per line. Mention the bundle idea only if given (sealed packs, no discount). Say that slow stock ' +
          'flagged early can be swapped into fast sellers. Sign with the rep\'s name. No prices, no promises beyond the facts.\n' +
          JSON.stringify({ shop: i.shop, repName: i.repName, orderItems: i.orderItems, bundle: i.bundle ?? null }),
      },
    ],
  },
  'weekly-summary': {
    effort: 'low',
    schema: () => obj({ summary: { type: 'string' } }),
    prompt: (i) => [
      {
        type: 'text',
        text:
          `Write the area manager's weekly summary in language "${String(i.language)}": 3 to 4 short sentences, plain ` +
          'language, celebrating outcomes (value kept from waste, batches resolved before act-by) rather than counting ' +
          'flags, stating the guardrail (must-sell availability) and one thing to decide next. Use only these numbers.\n' +
          JSON.stringify(i.facts),
      },
    ],
  },
};

function send(res: ServerResponse, status: number, body: Json) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('too_large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json;
}

export function aiMiddleware(getKey: () => string | undefined) {
  let client: Anthropic | null = null;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/ai/')) return next();
    const feature = url.slice('/api/ai/'.length).split('?')[0];
    const key = getKey();

    if (feature === 'status') return send(res, 200, { available: Boolean(key), model: key ? MODEL : null });
    const spec = FEATURES[feature];
    if (!spec || req.method !== 'POST') return send(res, 404, { error: 'unknown_feature' });
    if (!key) return send(res, 503, { error: 'no_key' });

    let input: Json;
    try {
      input = await readJson(req);
    } catch {
      return send(res, 400, { error: 'bad_request' });
    }

    client ??= new Anthropic({ apiKey: key, timeout: 30_000, maxRetries: 1 });
    try {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM,
        output_config: { effort: spec.effort, format: { type: 'json_schema', schema: spec.schema(input) } },
        messages: [{ role: 'user', content: spec.prompt(input) }],
      });
      if (response.stop_reason === 'refusal') return send(res, 422, { error: 'refusal' });
      if (response.stop_reason === 'max_tokens') return send(res, 502, { error: 'truncated' });
      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') return send(res, 502, { error: 'no_output' });
      return send(res, 200, JSON.parse(text.text) as Json);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return send(res, 401, { error: 'bad_key' });
      if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'rate_limited' });
      if (error instanceof Anthropic.APIError) return send(res, 502, { error: `api_${error.status ?? 'error'}` });
      if (error instanceof SyntaxError) return send(res, 502, { error: 'bad_json' });
      return send(res, 502, { error: 'network' });
    }
  };
}
