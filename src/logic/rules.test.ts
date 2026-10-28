import { describe, expect, it } from 'vitest';
import {
  amberPlaybook,
  bestReceiver,
  checkTransfer,
  escalate,
  LADDER_RUNGS,
  nextAmberStep,
  receiverShowsDemand,
  recoveryLadder,
  retailerCredit,
  skusForCategoryReview,
  type ReceiverCandidate,
} from './index';

describe('escalation', () => {
  it('green → rep in this visit; amber → AM in 7 days; red → AM + regional head in 48 h', () => {
    expect(escalate('green')).toEqual({ owners: ['rep'], decideWithinHours: 0 });
    expect(escalate('amber')).toEqual({ owners: ['area_manager'], decideWithinHours: 168 });
    expect(escalate('red')).toEqual({ owners: ['area_manager_and_regional_head'], decideWithinHours: 48 });
  });
  it('same SKU red across many outlets → category team', () => {
    const lines = ['o1', 'o2', 'o3'].map((outletId) => ({ skuId: 'SUN', outletId, status: 'red' as const }));
    lines.push({ skuId: 'LIP', outletId: 'o1', status: 'red' }, { skuId: 'LIP', outletId: 'o1', status: 'red' });
    expect(skusForCategoryReview(lines)).toEqual(['SUN']);
  });
  it('green credit: amber flag earns a swap; late return gets standard settlement', () => {
    expect(retailerCredit('amber')).toBe('swap_to_fast_sellers');
    expect(retailerCredit('expired')).toBe('standard_settlement');
  });
});

describe('amber playbook', () => {
  const base = { sealed: true, heroSkuAvailable: true, minisAvailable: true };
  it('starts with fixing visibility; moving is locked', () => {
    const p = amberPlaybook({ ...base, attemptsByVisit: [] });
    expect(p.map((s) => s.state)).toEqual(['next', 'available', 'available', 'available', 'locked']);
  });
  it('continues in order after earlier steps', () => {
    expect(nextAmberStep({ ...base, attemptsByVisit: [['fix_visibility', 'shopkeeper_brief']] })).toBe('bundle_hero');
  });
  it('bundles only sealed units', () => {
    const p = amberPlaybook({ ...base, sealed: false, attemptsByVisit: [['fix_visibility', 'shopkeeper_brief']] });
    expect(p.find((s) => s.step === 'bundle_hero')?.state).toBe('not_eligible');
    expect(p.find((s) => s.state === 'next')?.step).toBe('trial_minis');
  });
  it('unlocks moving only after the playbook failed across 2 visits', () => {
    const one = amberPlaybook({ ...base, attemptsByVisit: [['fix_visibility']] });
    expect(one.at(-1)?.state).toBe('locked');
    const two = amberPlaybook({
      ...base,
      attemptsByVisit: [['fix_visibility', 'shopkeeper_brief'], ['bundle_hero', 'trial_minis']],
    });
    expect(two.at(-1)).toEqual({ step: 'move', state: 'next' });
  });
});

describe('transfer rules', () => {
  const receiver: ReceiverCandidate = {
    outletId: 'R',
    recentVisitSales: [2, 1, 3],
    forecastRate: 0.4,
    nextRunDate: '2026-11-05',
  };
  it('receiver must show demand in each of its last 3 visits', () => {
    expect(receiverShowsDemand([2, 1, 3, 0])).toBe(true);
    expect(receiverShowsDemand([2, 0, 3])).toBe(false);
    expect(receiverShowsDemand([2, 1])).toBe(false);
  });
  it('needs a minimum value and an existing delivery run', () => {
    expect(checkTransfer({ value: 1500, receiver, weeksSinceSoldInBySameRep: null }).ok).toBe(true);
    expect(checkTransfer({ value: 1499, receiver, weeksSinceSoldInBySameRep: null }).blocks).toEqual(['below_min_value']);
    expect(
      checkTransfer({ value: 5000, receiver: { ...receiver, nextRunDate: null }, weeksSinceSoldInBySameRep: null }).blocks,
    ).toEqual(['no_existing_run']);
  });
  it('no transfer incentive on stock the same rep sold in within 8 weeks', () => {
    expect(checkTransfer({ value: 5000, receiver, weeksSinceSoldInBySameRep: 7 }).incentiveEligible).toBe(false);
    expect(checkTransfer({ value: 5000, receiver, weeksSinceSoldInBySameRep: 8 }).incentiveEligible).toBe(true);
  });
  it('best receiver = fastest eligible outlet', () => {
    const fast = { ...receiver, outletId: 'FAST', forecastRate: 2, recentVisitSales: [3, 0, 4] };
    const ok = { ...receiver, outletId: 'OK', forecastRate: 1 };
    expect(bestReceiver([receiver, fast, ok], 5000)?.outletId).toBe('OK');
    expect(bestReceiver([fast], 5000)).toBeNull();
  });
});

describe('near-expiry recovery ladder (first eligible wins)', () => {
  const base = { sealed: true, damagedPack: false, professionalRange: false, hasEligibleReceiver: true };
  const chosen = (over: Partial<typeof base> & { lifeLeft: number }) => recoveryLadder({ ...base, ...over }).chosen;

  it('transfers when life − 7 ≥ 60 and a receiver exists', () => {
    expect(chosen({ lifeLeft: 67 })).toBe('transfer');
    expect(chosen({ lifeLeft: 66 })).toBe('b2b_buyer');
    expect(chosen({ lifeLeft: 120, hasEligibleReceiver: false })).toBe('b2b_buyer');
  });
  it('routes a professional serum with 40 days left to the salon back-bar', () => {
    expect(chosen({ lifeLeft: 40, professionalRange: true })).toBe('salon_backbar');
  });
  it('then staff sale, donation, tester, EPR', () => {
    expect(chosen({ lifeLeft: 40, sealed: false })).toBe('staff_sale');
    expect(chosen({ lifeLeft: 25, sealed: false, damagedPack: true })).toBe('tester');
    expect(chosen({ lifeLeft: 10 })).toBe('epr_recycling');
  });
  it('always says stop shipping this batch, and never offers discounting', () => {
    const r = recoveryLadder({ ...base, lifeLeft: 100 });
    expect(r.stopShippingBatch).toBe(true);
    expect(LADDER_RUNGS as readonly string[]).not.toContain('discount');
    expect(r.rungs.map((x) => x.rung)).toEqual([...LADDER_RUNGS]);
  });
});
