import type { TFunction } from 'i18next';
import type { LineView } from '../../../data/derive';
import type { Dataset } from '../../../data/schema';
import type { AmberStep, LadderRung } from '../../../logic';
import { formatDate, formatDays } from '../../../i18n/format';

/** The suggested next action for a line: a playbook step or ladder rung, never anything else. */
export function nextAction(view: LineView): { kind: 'rung'; rung: LadderRung } | { kind: 'step'; step: AmberStep } | null {
  if (view.ladder) return { kind: 'rung', rung: view.ladder.chosen };
  const next = view.playbook?.find((s) => s.state === 'next');
  return next ? { kind: 'step', step: next.step } : null;
}

/** One line of "why" in plain words, built only from the data. */
export function whyText(view: LineView, data: Dataset, t: TFunction, action = nextAction(view)): string {
  if (!action) return '';
  const receiver = view.receiver ? data.outlets.find((o) => o.id === view.receiver!.outletId) : undefined;
  const runDate = view.receiver?.nextRunDate ? formatDate(view.receiver.nextRunDate) : '';
  const n = formatDays(view.evaluation.lifeLeft);
  if (action.kind === 'rung') {
    return t(`why.${action.rung}`, { outlet: receiver?.name, date: runDate, n });
  }
  if (action.step === 'move') {
    return receiver ? t('why.move', { outlet: receiver.name }) : t('why.moveNoReceiver');
  }
  const hero = data.skus.find((s) => s.id === view.sku.heroSkuId);
  return t(`why.${action.step}`, { hero: hero ? `${hero.brand} ${hero.name}` : '' });
}
