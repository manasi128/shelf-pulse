import { THRESHOLDS } from '../config/thresholds';

/** Slow-moving (amber) playbook, in order. */
export const AMBER_STEPS = ['fix_visibility', 'shopkeeper_brief', 'bundle_hero', 'trial_minis', 'move'] as const;
export type AmberStep = (typeof AMBER_STEPS)[number];

export type StepState = 'done' | 'next' | 'available' | 'not_eligible' | 'locked';

export interface PlaybookInput {
  /** Steps already tried at this outlet for this SKU, one entry per past amber visit. */
  attemptsByVisit: readonly (readonly AmberStep[])[];
  /** Bundles use sealed units only. */
  sealed: boolean;
  heroSkuAvailable: boolean;
  minisAvailable: boolean;
}

export interface PlaybookStep {
  step: AmberStep;
  state: StepState;
}

/**
 * fix visibility → 30-second brief → bundle with a hero SKU (sealed only) → trial sachets/minis
 * → move it only if these fail across 2 visits.
 */
export function amberPlaybook(input: PlaybookInput, cfg = THRESHOLDS.playbook): PlaybookStep[] {
  const tried = new Set(input.attemptsByVisit.flat());
  const failedVisits = input.attemptsByVisit.filter((v) => v.length > 0).length;
  const moveUnlocked = failedVisits >= cfg.moveAfterFailedVisits;

  const eligible = (s: AmberStep): boolean => {
    if (s === 'bundle_hero') return input.sealed && input.heroSkuAvailable;
    if (s === 'trial_minis') return input.minisAvailable;
    if (s === 'move') return moveUnlocked;
    return true;
  };

  let nextAssigned = false;
  return AMBER_STEPS.map((step) => {
    if (step !== 'move' && tried.has(step)) return { step, state: 'done' };
    if (!eligible(step)) return { step, state: step === 'move' ? 'locked' : 'not_eligible' };
    if (!nextAssigned) {
      nextAssigned = true;
      return { step, state: 'next' };
    }
    return { step, state: 'available' };
  });
}

/** The single step to suggest first, or null if none applies. */
export function nextAmberStep(input: PlaybookInput): AmberStep | null {
  return amberPlaybook(input).find((s) => s.state === 'next')?.step ?? null;
}
