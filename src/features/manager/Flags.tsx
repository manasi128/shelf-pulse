import { useId, useState } from 'react';
import { AlarmClock, Check, Eye, Truck, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../data/db';
import { flagQueue, recentDecisions, territory, type QueueItem } from '../../data/manager';
import { decideFlag } from '../../data/repo';
import { formatDate, formatINR } from '../../i18n/format';
import StatusPill from '../../components/StatusPill';
import SkuName from '../../components/SkuName';
import LineFacts from '../../components/LineFacts';
import { useManager } from './useManager';
import { savedBaseline } from './baseline';

function Deadline({ item }: { item: QueueItem }) {
  const { t } = useTranslation();
  const d = item.daysToDecide;
  const text =
    d < 0 ? t('mgr.flags.overdue', { date: formatDate(item.flag.decideBy) }) : d === 0 ? t('mgr.flags.dueToday') : t('mgr.flags.due', { date: formatDate(item.flag.decideBy) });
  return (
    <p className={`flex items-center gap-1.5 text-sm font-semibold ${d <= 0 ? 'text-red' : ''}`}>
      <AlarmClock size={16} aria-hidden="true" />
      {text}
    </p>
  );
}

function FlagCard({ item, today }: { item: QueueItem; today: string }) {
  const { t } = useTranslation();
  const noteId = useId();
  const [note, setNote] = useState('');
  const p = item.flag.proposal;
  const proposal = p.kind === 'route' ? t(`rung.${p.route}`) : t(`step.${p.step}`);
  const decide = (decision: 'approved' | 'declined') =>
    void decideFlag(db, { flagId: item.flag.id, decision, today, note: note.trim() || undefined });

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.outlet.name}</p>
          <p className="text-sm text-muted">
            {item.outlet.area} · {t('mgr.flags.raised', { date: formatDate(item.flag.raisedOn) })}
          </p>
        </div>
        <StatusPill status={item.flag.status} />
      </div>
      <div className="mt-2">
        <SkuName sku={item.sku} as="p" />
      </div>

      <div className="mt-3 rounded-md border-l-4 border-accent bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t('mgr.flags.proposed')}</p>
        <p className="mt-0.5 text-lg font-semibold">{proposal}</p>
        {item.receiver && p.kind === 'route' && p.runDate && (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Truck size={16} aria-hidden="true" />
            {t('mgr.flags.toOutlet', { outlet: item.receiver.name, date: formatDate(p.runDate) })}
          </p>
        )}
        {item.partnerName && (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Users size={16} aria-hidden="true" />
            {t('mgr.flags.via', { partner: item.partnerName })}
          </p>
        )}
        <p className="mt-1 text-sm">
          {t('mgr.flags.units', { n: item.flag.units })} · {t('mgr.flags.value', { value: formatINR(item.value) })}
        </p>
      </div>

      <div className="mt-3">
        <Deadline item={item} />
        <p className="mt-1 text-sm text-muted">{t(`owner.${item.flag.status === 'red' ? 'area_manager_and_regional_head' : 'area_manager'}`)}</p>
      </div>

      {item.evidence && (
        <details className="mt-2">
          <summary className="tap flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
            <Eye size={16} aria-hidden="true" />
            {t('mgr.flags.evidence')}
          </summary>
          <LineFacts view={item.evidence} />
          {item.evidence.evaluation.signals.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {item.evidence.evaluation.signals.map((s) => (
                <li key={s} className="rounded-pill bg-amber-soft px-2 py-0.5 font-semibold text-amber">
                  {t(`signal.${s}`)}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      <label htmlFor={noteId} className="mt-3 block text-sm font-semibold">
        {t('mgr.flags.note')}
      </label>
      <input
        id={noteId}
        className="tap mt-1 w-full rounded-md hairline border-line-strong bg-raised px-3"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="tap inline-flex items-center justify-center gap-2 rounded-md hairline border-line-strong px-4 cta"
          onClick={() => decide('declined')}
        >
          <X size={18} aria-hidden="true" />
          {t('mgr.flags.decline')}
        </button>
        <button
          type="button"
          className="tap inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary"
          onClick={() => decide('approved')}
        >
          <Check size={18} aria-hidden="true" />
          {t('mgr.flags.approve')}
        </button>
      </div>
    </li>
  );
}

/** The flag queue: red first, nearest deadline first, with the rep's evidence one tap away. */
export default function Flags() {
  const { t } = useTranslation();
  const m = useManager();
  if (!m) return <p className="text-muted">{t('common.loading')}</p>;
  savedBaseline(m.data);
  const queue = flagQueue(m.data, m.drafts, m.today);
  const decided = recentDecisions(m.data, m.today);
  const category = territory(m.data, m.drafts, m.today).category;
  const name = (id: string) => m.data.outlets.find((o) => o.id === id)?.name ?? id;
  const sku = (id: string) => m.data.skus.find((s) => s.id === id)!;

  return (
    <section>
      <h1 className="text-4xl">{t('mgr.flags.title')}</h1>
      <p className="mt-1 text-muted">{t('mgr.flags.intro')}</p>

      {category.map((c) => (
        <div key={c.sku.id} className="mt-4 rounded-lg hairline border-red bg-red-soft p-3" role="note">
          <p className="font-semibold text-red">{t('mgr.flags.category')}</p>
          <p className="mt-1 text-sm">{t('mgr.flags.categoryBody', { sku: `${c.sku.brand} ${c.sku.name}`, n: c.outlets })}</p>
        </div>
      ))}

      {queue.length === 0 ? (
        <p className="card mt-4 p-4">{t('mgr.flags.empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {queue.map((item) => (
            <FlagCard key={item.flag.id} item={item} today={m.today} />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mt-8 text-2xl">{t('mgr.flags.decided')}</h2>
          <ul className="mt-2 divide-y rounded-lg hairline">
            {decided.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  <span className="font-semibold">{name(f.outletId)}</span> · {sku(f.skuId).name} ·{' '}
                  {f.proposal.kind === 'route' ? t(`rung.${f.proposal.route}`) : t(`step.${f.proposal.step}`)}
                </span>
                <span className={`inline-flex items-center gap-1 font-semibold ${f.state === 'approved' ? 'text-green' : 'text-muted'}`}>
                  {f.state === 'approved' ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                  {t(`mgr.flags.${f.state}`)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
