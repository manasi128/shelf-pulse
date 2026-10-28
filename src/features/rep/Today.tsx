import { Link } from 'react-router-dom';
import { ChevronRight, CircleCheckBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEMO_TODAY } from '../../config/demo';
import { rankToday } from '../../data/derive';
import { useDataset, useDrafts } from '../../data/hooks';
import ReasonText from '../../components/ReasonText';
import StatusPill, { type Status } from '../../components/StatusPill';

/** The day's beat, ranked by risk, with the top reasons in plain words. */
export default function Today() {
  const { t } = useTranslation();
  const data = useDataset();
  const drafts = useDrafts();
  if (!data || !drafts) return <p className="p-6 text-muted">{t('common.loading')}</p>;

  const ranked = rankToday(data, drafts, DEMO_TODAY);

  return (
    <section className="px-4 py-6">
      <h1 className="text-4xl">{t('rep.todayTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('rep.beatLine', { territory: data.meta.territory, count: ranked.length })}</p>
      <p className="mt-2 text-muted">{t('rep.todayIntro')}</p>

      <ol className="mt-5 space-y-3">
        {ranked.map((r, i) => {
          const counts = (['red', 'amber'] as Status[])
            .map((s) => [s, r.lines.filter((l) => l.evaluation.status === s).length] as const)
            .filter(([, n]) => n > 0);
          return (
            <li key={r.outletId}>
              <Link to={`outlet/${r.outletId}`} className="card flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill font-heading text-lg ${
                  i === 0 ? 'bg-primary text-on-primary' : 'hairline border-line-strong'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-body text-lg font-semibold leading-snug">{r.outlet.name}</h2>
                {drafts[r.outletId]?.completedAt && (
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-green">
                    <CircleCheckBig size={16} aria-hidden="true" />
                    {t('brief.visitDone')}
                  </p>
                )}
                <p className="text-sm text-muted">
                  {r.outlet.area} · {t('rep.routeStop', { n: r.outlet.routeOrder })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {counts.length ? (
                    counts.map(([s, n]) => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <StatusPill status={s} />
                        <span className="text-sm font-semibold">×{n}</span>
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <StatusPill status="green" />
                      <span className="text-sm">{t('rep.allClear')}</span>
                    </span>
                  )}
                </div>
                {r.reasons.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {r.reasons.slice(0, 2).map((reason) => (
                      <li key={reason.code}>
                        <ReasonText reason={reason} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ChevronRight size={20} aria-hidden="true" className="mt-1 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
