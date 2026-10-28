import { Link } from 'react-router-dom';
import { BellRing, CircleCheckBig, Hourglass, PackagePlus, Sparkles, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { actByNudge, forecastRate, notReordered, ratesNewestFirst, salesNewestFirst, seedLaunchOutlets } from '../../../logic';
import { formatDate } from '../../../i18n/format';
import StatusPill from '../../../components/StatusPill';
import SkuName from '../../../components/SkuName';
import LineFacts from '../../../components/LineFacts';
import { useOutletVisit } from './useOutletVisit';

const ORDER = { red: 0, amber: 1, green: 2 } as const;

/** Pre-visit brief: what needs attention before the rep walks in. */
export default function Brief() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  if (!v) return null;
  const { data, outlet, lines, draft } = v;

  const atRisk = lines.filter((l) => l.evaluation.status !== 'green');
  const nudge = actByNudge(atRisk.map((l) => l.evaluation.daysToActBy));
  const stale = new Set(notReordered(lines.map((l) => ({ skuId: l.sku.id, orderedQtyByVisit: l.line.orders }))));
  const flags = data.flags.filter((f) => f.outletId === outlet.id && f.state === 'open');
  const launch = data.skus.find((s) => s.limitedEdition);
  const seedTo = launch
    ? seedLaunchOutlets(
        data.lines
          .filter((l) => data.skus.find((s) => s.id === l.skuId)?.category === launch.category)
          .map((l) => ({
            outletId: l.outletId,
            categoryRatePerDay: forecastRate(ratesNewestFirst(l.visits)),
            recentVisitSales: salesNewestFirst(l.visits),
          })),
      ).slice(0, 3)
    : [];
  const lastVisit = lines[0]?.line.visits.at(-1)?.date;
  const sorted = [...lines].sort((a, b) => ORDER[a.evaluation.status] - ORDER[b.evaluation.status]);

  return (
    <section className="px-4 py-5">
      <h1 className="text-3xl">{t('brief.title')}</h1>
      {lastVisit && <p className="text-sm text-muted">{t('brief.lastVisit', { date: formatDate(lastVisit) })}</p>}
      {draft?.completedAt && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-semibold text-green">
          <CircleCheckBig size={18} aria-hidden="true" />
          {t('brief.visitDone')}
        </p>
      )}

      {(nudge.thisWeek > 0 || nudge.overdue > 0) && (
        <div className="mt-4 rounded-lg hairline border-accent bg-accent-soft p-3" role="note">
          {nudge.overdue > 0 && (
            <p className="flex items-center gap-2 font-semibold">
              <BellRing size={18} aria-hidden="true" className="shrink-0 text-accent" />
              {t('brief.nudgeOverdue', { count: nudge.overdue })}
            </p>
          )}
          {nudge.thisWeek > 0 && (
            <p className="flex items-center gap-2 font-semibold">
              <BellRing size={18} aria-hidden="true" className="shrink-0 text-accent" />
              {t('brief.nudgeThisWeek', { count: nudge.thisWeek })}
            </p>
          )}
        </div>
      )}

      <Link
        to="count"
        className="tap mt-4 flex w-full items-center justify-center rounded-md bg-primary px-4 cta text-on-primary"
      >
        {t('brief.startCheck')}
      </Link>

      <h2 className="mt-6 text-xl">{t('brief.redList')}</h2>
      <ul className="mt-2 space-y-2">
        {sorted.map((l) => (
          <li key={l.sku.id} className="card p-3">
            <div className="flex items-start justify-between gap-2">
              <SkuName sku={l.sku} />
              <StatusPill status={l.evaluation.status} />
            </div>
            <LineFacts view={l} />
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              {!l.counted && l.line.pendingDelivered > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Truck size={14} aria-hidden="true" />
                  {t('brief.billed', { n: l.line.pendingDelivered })}
                </span>
              )}
              {stale.has(l.sku.id) && (
                <span className="inline-flex items-center gap-1">
                  <Hourglass size={14} aria-hidden="true" />
                  {t('brief.notReordered')}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {flags.length > 0 && (
        <>
          <h2 className="mt-6 text-xl">{t('brief.openFlags')}</h2>
          <ul className="mt-2 space-y-2">
            {flags.map((f) => {
              const sku = data.skus.find((s) => s.id === f.skuId)!;
              return (
                <li key={f.id} className="card flex items-start justify-between gap-2 p-3">
                  <div>
                    <SkuName sku={sku} as="p" />
                    <p className="text-sm text-muted">{t('line.flagOpen', { date: formatDate(f.decideBy) })}</p>
                  </div>
                  <StatusPill status={f.status} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {launch && seedTo.includes(outlet.id) && (
        <div className="card mt-6 p-3">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} aria-hidden="true" className="text-accent" />
            {t('brief.launch')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <PackagePlus size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <SkuName sku={launch} as="p" />
          </div>
          <p className="mt-1 text-sm text-muted">{t('brief.launchWhy')}</p>
        </div>
      )}
    </section>
  );
}
