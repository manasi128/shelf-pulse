import { RulesAdvisor } from './mock/advisor';
import { MockShelfReader } from './mock/shelf';
import { MockVoiceExtractor } from './mock/voice';
import { TemplateWriter } from './mock/writer';
import { LiveAdvisor, LiveShelfReader, LiveVoiceExtractor, LiveWriter } from './live';
import type { Advisor, AiMode, AiServices, ShelfReader, VoiceExtractor, Writer } from './types';

/** Calls `live`; on any failure (no key, offline, timeout, invalid output) uses `fallback`. */
function withFallback<T extends object>(live: T, fallback: T): T {
  return new Proxy(live, {
    get(target, prop) {
      const liveFn = (target as Record<PropertyKey, unknown>)[prop];
      const fallbackFn = (fallback as Record<PropertyKey, unknown>)[prop];
      if (typeof liveFn !== 'function' || typeof fallbackFn !== 'function') return liveFn;
      return async (...args: unknown[]) => {
        try {
          return await liveFn.apply(target, args);
        } catch {
          return fallbackFn.apply(fallback, args);
        }
      };
    },
  });
}

/**
 * off  - rules and manual entry only: no photo or voice reading.
 * mock - offline demo: example photo/voice readings; next action and messages from the rules.
 * live - server route with a key; falls back to the offline version on any failure.
 */
export function getAi(mode: AiMode): AiServices {
  if (mode === 'off') {
    return { mode, shelf: null, voice: null, advisor: new RulesAdvisor(), writer: new TemplateWriter() };
  }
  if (mode === 'mock') {
    return {
      mode,
      shelf: new MockShelfReader(),
      voice: new MockVoiceExtractor(),
      advisor: new RulesAdvisor(),
      writer: new TemplateWriter(),
    };
  }
  return {
    mode,
    shelf: withFallback<ShelfReader>(new LiveShelfReader(), new MockShelfReader()),
    voice: withFallback<VoiceExtractor>(new LiveVoiceExtractor(), new MockVoiceExtractor()),
    advisor: withFallback<Advisor>(new LiveAdvisor(), new RulesAdvisor()),
    writer: withFallback<Writer>(new LiveWriter(), new TemplateWriter()),
  };
}

export { getAiMode, setAiMode, useAiMode, liveAiAvailable } from './settings';
