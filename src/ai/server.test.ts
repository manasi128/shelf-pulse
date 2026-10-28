import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { aiMiddleware } from '../../server/ai';

function call(url: string, method = 'GET', body?: unknown) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []) as unknown as IncomingMessage;
  Object.assign(req, { url, method });
  return new Promise<{ status: number; json: unknown; nextCalled: boolean }>((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      end(payload: string) {
        resolve({ status: res.statusCode, json: JSON.parse(payload), nextCalled: false });
      },
    };
    void aiMiddleware(() => undefined)(req, res as unknown as ServerResponse, () => resolve({ status: 0, json: null, nextCalled: true }));
  });
}

describe('server AI route without a key', () => {
  it('reports live AI as unavailable and never echoes a key', async () => {
    expect(await call('/api/ai/status')).toMatchObject({ status: 200, json: { available: false, model: null } });
  });
  it('refuses feature calls with 503 so the app falls back', async () => {
    expect(await call('/api/ai/next-action', 'POST', { candidates: [] })).toMatchObject({ status: 503 });
  });
  it('404s unknown features and passes other paths through', async () => {
    expect(await call('/api/ai/anything', 'POST', {})).toMatchObject({ status: 404 });
    expect((await call('/rep')).nextCalled).toBe(true);
  });
});
