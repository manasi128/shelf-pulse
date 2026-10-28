import { Link } from 'react-router-dom';
import { ArrowRight, Ban, Check, CircleCheckBig, Lock, OctagonX, Send, Truck, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../data/db';
import type { LineView } from '../../../data/derive';
import { markStepDone, raiseFlag } from '../../../data/repo';
import type { Flag } from '../../../data/schema';
import type { AmberStep, LadderRung } from '../../../logic';
import AiBadge from '../../../components/AiBadge';
import { useNextAction } from './useNextAction';
import { formatDate } from '../../../i18n/format';
import StatusPill from '../../../components/StatusPill';
import SkuName from '../../../components/SkuName';
import LineFacts from '../../../components/LineFacts';
import { useOutletVisit, type OutletVisit } from './useOutletVisit';

const PARTNER_FOR: Partial<Record<string, string>> = { salon_backbar: 'salon', b2b_buyer: 'b2b_buyer', donation: 'ngo' };

function FlagStatus({ flag }: { flag: Flag }) {
  const { t } = useTranslation();
  return flag.state === 'open' ? (
    <p role="status" className="mt-3 flex items-center gap-2 rounded-md bg-surface p-2 text-sm font-semibold">
      <Send size={16} aria-hidden="true" />
      {t('line.flagOpen', { date: formatDate(flag.decideBy) })}
    </p>
  ) : (
    <p role="status" className="mt-3 flex items-center gap-2 rounded-md bg-green-soft p-2 text-sm font-semibold text-green">
      <CircleCheckBig size={16} aria-hidden="true" />
      {t('line.flagApproved')}
    </p>
  );
}

type Suggestion = ReturnType<typeof useNextAction>;

function SuggestionHead({ next }: { next: Suggestion }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t('actions.suggested')}</p>
      {next && <AiBadge source={next.source} confidence={next.confidence} />}
    </div>
  );
}

function RuleOverride({ next }: { next: Suggestion }) {
  const { t } = useTranslation();
  if (!next?.differsFromRule) return null;
  return (
    <button type="button" className="tap mt-1 text-sm underline underline-offset-2" onClick={next.useRuleInstead}>
      {t('ai.chooseRule')}
    </button>
  );
}

const primaryBtn =
  'tap mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary';

function RedCard({ v, view, flag }: { v: OutletVisit; view: LineView; flag?: Flag }) {
  const { t } = useTranslation();
  const ladder = view.ladder!;
  const next = useNextAction(view, v.data);
  const rung = (next?.choice ?? ladder.chosen) as LadderRung;

  async function send() {
    const partnerKind = PARTNER_FOR[rung];
    await raiseFlag(db, {
      outletId: v.outlet.id,
      skuId: view.sku.id,
      status: 'red',
      proposal: {
        kind: 'route',
        route: rung,
        ...(rung === 'transfer' && view.receiver
          ? { receiverOutletId: view.receiver.outletId, runDate: view.receiver.nextRunDate ?? undefined }
          : {}),
        ...(partnerKind ? { partnerId: v.data.partners.find((p) => p.kind === partnerKind)?.id } : {}),
      },
      units: view.stockNow,
      unitPrice: view.sku.unitPrice,
      actBy: view.evaluation.actBy,
      today: v.today,
    });
  }

  return (
    <li className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <SkuName sku={view.sku} />
        <StatusPill status="red" />
      </div>
      <LineFacts view={view} />

      <div className="mt-3 rounded-md border-l-4 border-accent bg-surface p-3">
        <SuggestionHead next={next} />
        <p className="mt-0.5 text-lg font-semibold">{t(`rung.${rung}`)}</p>
        <p className="mt-1 text-sm">{next?.why}</p>
        <RuleOverride next={next} />
      </div>

      <ul className="mt-2 flex flex-wrap gap-2 text-sm">
        <li className="inline-flex items-center gap-1 rounded-pill bg-red-soft px-2.5 py-0.5 font-semibold text-red">
          <OctagonX size={14} aria-hidden="true" />
          {t('actions.stopShipping')}
        </li>
        <li className="inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-0.5">
          <Ban size={14} aria-hidden="true" />
          {t('actions.noDiscount')}
        </li>
      </ul>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Users size={16} aria-hidden="true" className="shrink-0" />
        {t(`owner.${view.escalation.owners[0]}`)}
      </p>

      {flag ? (
        <FlagStatus flag={flag} />
      ) : (
        <button type="button" className={primaryBtn} onClick={() => void send()}>
          <Send size={18} aria-hidden="true" />
          {t('actions.send')}
        </button>
      )}

      <details className="mt-2">
        <summary className="tap flex cursor-pointer items-center text-sm font-semibold">{t('actions.allRoutes')}</summary>
        <ol className="mt-1 space-y-1 text-sm">
          {ladder.rungs.map((r) => (
            <li key={r.rung} className={`flex items-center gap-2 ${r.eligible ? '' : 'text-muted line-through'}`}>
              {r.eligible ? <Check size={16} aria-hidden="true" className="text-green" /> : <X size={16} aria-hidden="true" />}
              <span className={r.rung === rung ? 'font-semibold' : ''}>{t(`rung.${r.rung}`)}</span>
              {!r.eligible && <span className="sr-only">{t('actions.notPossible')}</span>}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

function AmberCard({ v, view, flag }: { v: OutletVisit; view: LineView; flag?: Flag }) {
  const { t } = useTranslation();
  const steps = view.playbook!;
  const suggestion = useNextAction(view, v.data);
  const next = suggestion?.choice as AmberStep | undefined;
  const receiver = view.receiver ? v.data.outlets.find((o) => o.id === view.receiver!.outletId) : undefined;

  async function done(step: AmberStep) {
    await markStepDone(db, { outletId: v.outlet.id, skuId: view.sku.id, step, today: v.today });
  }
  async function proposeMove() {
    await raiseFlag(db, {
      outletId: v.outlet.id,
      skuId: view.sku.id,
      status: 'amber',
      proposal: {
        kind: 'route',
        route: 'transfer',
        receiverOutletId: view.receiver?.outletId,
        runDate: view.receiver?.nextRunDate ?? undefined,
      },
      units: view.stockNow,
      unitPrice: view.sku.unitPrice,
      actBy: view.evaluation.actBy,
      today: v.today,
    });
  }

  return (
    <li className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <SkuName sku={view.sku} />
        <StatusPill status="amber" />
      </div>
      <LineFacts view={view} />

      {next && (
        <div className="mt-3 rounded-md border-l-4 border-accent bg-surface p-3">
          <SuggestionHead next={suggestion} />
          <p className="mt-0.5 text-lg font-semibold">{t(`step.${next}`)}</p>
          <p className="mt-1 text-sm">{suggestion?.why}</p>
          <RuleOverride next={suggestion} />
          {next === 'move' && receiver && view.receiver?.nextRunDate && (
            <>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <Truck size={16} aria-hidden="true" className="shrink-0" />
                {t('actions.moveTo', { outlet: receiver.name, date: formatDate(view.receiver.nextRunDate) })}
              </p>
              <p className="mt-1 text-xs text-muted">{t('actions.settlement')}</p>
              {view.transfer && !view.transfer.incentiveEligible && (
                <p className="mt-1 text-xs text-muted">{t('actions.noIncentive')}</p>
              )}
            </>
          )}
        </div>
      )}

      {next === 'move' ? (
        flag?.proposal.kind === 'route' ? (
          <FlagStatus flag={flag} />
        ) : view.receiver ? (
          <button type="button" className={primaryBtn} onClick={() => void proposeMove()}>
            <Truck size={18} aria-hidden="true" />
            {t('actions.proposeMove')}
          </button>
        ) : null
      ) : next ? (
        <button type="button" className={primaryBtn} onClick={() => void done(next)}>
          <Check size={18} aria-hidden="true" />
          {t('actions.markDone')}
        </button>
      ) : null}

      <ol className="mt-3 space-y-1 text-sm">
        {steps.map((s, i) => (
          <li key={s.step} className={`flex items-start gap-2 ${s.state === 'not_eligible' || s.state === 'locked' ? 'text-muted' : ''}`}>
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {s.state === 'done' ? (
                <Check size={16} className="text-green" />
              ) : s.state === 'next' ? (
                <ArrowRight size={16} className="text-accent" />
              ) : s.state === 'locked' ? (
                <Lock size={16} />
              ) : (
                <span className="inline-block w-4 text-center">{i + 1}</span>
              )}
            </span>
            <span>
              <span className={s.state === 'next' ? 'font-semibold' : ''}>{t(`step.${s.step}`)}</span>
              {s.state === 'done' && <span className="text-green"> · {t('actions.done')}</span>}
              {s.state === 'locked' && <span> · {t('actions.locked')}</span>}
              {s.state === 'not_eligible' && <span> · {t('actions.notPossible')}</span>}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-sm">{t('actions.greenCredit')}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted">
        <Users size={16} aria-hidden="true" className="shrink-0" />
        {t(`owner.${view.escalation.owners[0]}`)}
      </p>
    </li>
  );
}

/** Different playbooks for amber (help it sell) and red (recover value). */
export default function Actions() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  if (!v) return null;
  const red = v.lines.filter((l) => l.evaluation.status === 'red');
  const amber = v.lines.filter((l) => l.evaluation.status === 'amber');
  const flagFor = (skuId: string) =>
    v.data.flags.find((f) => f.outletId === v.outlet.id && f.skuId === skuId && f.raisedOn === v.today);

  return (
    <section className="px-4 py-5">
      <h1 className="text-3xl">{t('actions.title')}</h1>
      {!red.length && !amber.length && <p className="mt-3">{t('actions.allGreen')}</p>}

      {red.length > 0 && (
        <>
          <h2 className="mt-5 flex items-center gap-2 text-xl">
            <StatusPill status="red" />
            {t('actions.red')}
          </h2>
          <ul className="mt-2 space-y-3">
            {red.map((l) => (
              <RedCard key={l.sku.id} v={v} view={l} flag={flagFor(l.sku.id)} />
            ))}
          </ul>
        </>
      )}

      {amber.length > 0 && (
        <>
          <h2 className="mt-6 flex items-center gap-2 text-xl">
            <StatusPill status="amber" />
            {t('actions.amber')}
          </h2>
          <ul className="mt-2 space-y-3">
            {amber.map((l) => (
              <AmberCard key={l.sku.id} v={v} view={l} flag={flagFor(l.sku.id)} />
            ))}
          </ul>
        </>
      )}

      <Link to="../order" relative="path" className="tap mt-5 flex w-full items-center justify-center rounded-md hairline border-line-strong px-4 cta">
        {t('actions.next')}
      </Link>
    </section>
  );
}
