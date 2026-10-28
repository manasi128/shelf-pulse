import { CircleCheckBig, CircleSlash, Flag, ShieldCheck, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { territory } from '../../data/manager';
import { formatINR } from '../../i18n/format';
import StatusPill from '../../components/StatusPill';
import { useManager } from './useManager';

/** Every outlet on the beat, riskiest first: status, value at risk, flags, today's visit, must-sell. */
export default function Territory() {
  const { t } = useTranslation();
  const m = useManager();
  if (!m) return <p className="text-muted">{t('common.loading')}</p>;
  const { rows, category } = territory(m.data, m.drafts, m.today);

  return (
    <section>
      <h1 className="text-4xl">{t('mgr.territory.title')}</h1>
      <p className="mt-1 text-muted">{m.data.meta.territory}</p>

      {category.map((c) => (
        <div key={c.sku.id} className="mt-4 rounded-lg hairline border-red bg-red-soft p-3" role="note">
          <p className="font-semibold text-red">{t('mgr.flags.category')}</p>
          <p className="mt-1 text-sm">{t('mgr.flags.categoryBody', { sku: `${c.sku.brand} ${c.sku.name}`, n: c.outlets })}</p>
        </div>
      ))}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.outlet.id} className="card p-4">
            <p className="font-semibold">{r.outlet.name}</p>
            <p className="text-sm text-muted">{r.outlet.area}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {r.red > 0 && (
                <span className="inline-flex items-center gap-1">
                  <StatusPill status="red" />
                  <span className="text-sm font-semibold">×{r.red}</span>
                </span>
              )}
              {r.amber > 0 && (
                <span className="inline-flex items-center gap-1">
                  <StatusPill status="amber" />
                  <span className="text-sm font-semibold">×{r.amber}</span>
                </span>
              )}
              {r.red + r.amber === 0 && (
                <span className="inline-flex items-center gap-2">
                  <StatusPill status="green" />
                  <span className="text-sm">{t('mgr.territory.allClear')}</span>
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-muted">{t('mgr.territory.atRisk')}</dt>
                <dd className="font-semibold">{formatINR(r.atRisk)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t('mgr.territory.openFlags')}</dt>
                <dd className="inline-flex items-center gap-1 font-semibold">
                  <Flag size={14} aria-hidden="true" />
                  {r.openFlags}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t('mgr.territory.visit')}</dt>
                <dd className={`inline-flex items-center gap-1 font-semibold ${r.visited ? 'text-green' : ''}`}>
                  {r.visited ? <CircleCheckBig size={14} aria-hidden="true" /> : <CircleSlash size={14} aria-hidden="true" />}
                  {r.visited ? t('mgr.territory.visited') : t('mgr.territory.notVisited')}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t('mgr.territory.mustSell')}</dt>
                <dd className={`inline-flex items-center gap-1 font-semibold ${r.mustSellOnShelf ? 'text-green' : 'text-red'}`}>
                  {r.mustSellOnShelf ? <ShieldCheck size={14} aria-hidden="true" /> : <ShieldX size={14} aria-hidden="true" />}
                  {r.mustSellOnShelf ? t('mgr.territory.onShelf') : t('mgr.territory.missing')}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
