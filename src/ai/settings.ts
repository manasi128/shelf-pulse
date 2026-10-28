import { useEffect, useState } from 'react';
import type { AiMode } from './types';

const KEY = 'shelfpulse.aiMode';
const listeners = new Set<(m: AiMode) => void>();

export function getAiMode(): AiMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'off' || v === 'mock' || v === 'live') return v;
  } catch {
    // Storage blocked: default below.
  }
  return 'mock';
}

export function setAiMode(mode: AiMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Non-critical: the choice just won't persist.
  }
  listeners.forEach((l) => l(mode));
}

export function useAiMode(): AiMode {
  const [mode, setMode] = useState(getAiMode);
  useEffect(() => {
    listeners.add(setMode);
    return () => {
      listeners.delete(setMode);
    };
  }, []);
  return mode;
}

/** Whether the server route has a key. Never exposes the key itself. */
export async function liveAiAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/ai/status');
    if (!r.ok) return false;
    return ((await r.json()) as { available?: boolean }).available === true;
  } catch {
    return false;
  }
}
