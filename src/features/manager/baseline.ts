import { sustainabilityTally } from '../../logic';
import type { Dataset } from '../../data/schema';

/**
 * ₹ saved when the desk was first opened this browser session; Impact shows the change since then.
 * Kept in sessionStorage so a page reload mid-demo doesn't reset it. Cleared by "Reset demo data".
 */
const KEY = 'shelfpulse.savedBaseline';
let memory: number | null = null;

export function savedBaseline(data: Dataset): number {
  if (memory != null) return memory;
  try {
    const v = sessionStorage.getItem(KEY);
    if (v != null && Number.isFinite(Number(v))) return (memory = Number(v));
  } catch {
    // Storage blocked: fall back to this page load.
  }
  memory = sustainabilityTally(data.resolutions).rupeesSaved;
  try {
    sessionStorage.setItem(KEY, String(memory));
  } catch {
    // Non-critical.
  }
  return memory;
}

export function clearSavedBaseline() {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Non-critical.
  }
}
