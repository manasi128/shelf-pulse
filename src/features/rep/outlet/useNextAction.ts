import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAi } from '../../../ai/useAi';
import type { ActionCandidate, NextAction } from '../../../ai/types';
import type { LineView } from '../../../data/derive';
import type { Dataset } from '../../../data/schema';
import { nextAction, whyText } from './why';

const cache = new Map<string, NextAction>();

/** Eligible options only: ladder rungs for red, open playbook steps for amber. */
export function candidatesFor(view: LineView, t: (k: string) => string): ActionCandidate[] {
  const rule = nextAction(view);
  if (view.ladder) {
    return view.ladder.rungs
      .filter((r) => r.eligible)
      .map((r) => ({ id: r.rung, label: t(`rung.${r.rung}`), isRuleChoice: rule?.kind === 'rung' && rule.rung === r.rung }));
  }
  return (view.playbook ?? [])
    .filter((s) => s.state === 'next' || s.state === 'available')
    .map((s) => ({ id: s.step, label: t(`step.${s.step}`), isRuleChoice: s.state === 'next' }));
}

function factsFor(view: LineView, data: Dataset): string[] {
  const e = view.evaluation;
  const receiver = view.receiver ? data.outlets.find((o) => o.id === view.receiver!.outletId) : undefined;
  return [
    `Act-by date: ${e.actBy ?? 'none'}${e.daysToActBy != null ? ` (${e.daysToActBy} days from today)` : ''}`,
    `Days of shelf life left: ${e.lifeLeft}`,
    `Units on hand: ${view.stockNow}; sold since last visit: ${e.salesSinceLast}`,
    `Forecast sales per day: ${e.forecastRate.toFixed(2)}`,
    `Signals: ${e.signals.join(', ') || 'none'}`,
    `Professional range: ${view.sku.professional ? 'yes' : 'no'}`,
    receiver
      ? `Matched receiving shop: ${receiver.name}, next delivery run ${view.receiver!.nextRunDate}, sells ${view.receiver!.forecastRate.toFixed(2)} per day`
      : 'No matched receiving shop',
  ];
}

/** The suggested next action for a line, from the advisor (live AI or rules). */
export function useNextAction(view: LineView, data: Dataset) {
  const { t, i18n } = useTranslation();
  const ai = useAi();
  const candidates = candidatesFor(view, t);
  const ruleWhy = whyText(view, data, t);
  const rule = candidates.find((c) => c.isRuleChoice) ?? candidates[0];
  const key = [ai.mode, view.line.id, view.evaluation.status, view.stockNow, view.evaluation.signals.join('+'), candidates.map((c) => c.id).join('+'), i18n.language].join('|');
  const [result, setResult] = useState<NextAction | undefined>(() => cache.get(key));
  const [useRule, setUseRule] = useState(false);

  useEffect(() => {
    const hit = cache.get(key);
    if (hit) return setResult(hit);
    if (!rule) return;
    let live = true;
    void ai.advisor
      .nextAction({
        language: i18n.language,
        product: `${view.sku.brand} ${view.sku.name}`,
        status: view.evaluation.status as 'amber' | 'red',
        facts: factsFor(view, data),
        candidates,
        ruleWhy,
      })
      .then((r) => {
        cache.set(key, r);
        if (live) setResult(r);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!rule) return null;
  const fromRules = { choice: rule.id, why: ruleWhy, confidence: 1, source: 'rules' as const };
  const shown = useRule || !result ? fromRules : result;
  return {
    ...shown,
    label: candidates.find((c) => c.id === shown.choice)?.label ?? rule.label,
    differsFromRule: !useRule && result != null && result.choice !== rule.id,
    useRuleInstead: () => setUseRule(true),
  };
}
