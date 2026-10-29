import { Leaf, PackageCheck, Recycle, Trophy, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { kpis } from '../../data/manager';
import { formatINR, formatINRCompact, formatNumber } from '../../i18n/format';
import KpiTile from '../../components/KpiTile';
import RouteBars from '../../components/charts/RouteBars';
import { useManager } from './useManager';
import { savedBaseline } from './baseline';

const dec1 = new Intl.NumberFormat('en-IN-u-nu-latn', { maximumFractionDigits: 1 });


/** Sustainability tally by recovery rung, and outcomes to celebrate. Never a count of flags raised. */
export default function Impact() {
  const { t } = useTranslation();
  const m = useManager();
  if (!m) return <p className="text-muted">{t('common.loading')}</p>;

  const k = kpis(m.data, m.drafts, m.today);
  const tally = k.tally;
  const delta = tally.rupeesSaved - savedBaseline(m.data);
  const routes = [...tally.byRoute].sort((a, b) => b.rupeesSaved - a.rupeesSaved || b.units - a.units);

  return (
    <section>
      <h1 className="text-4xl">{t('mgr.impact.title')}</h1>
      <p className="mt-1 max-w-prose text-muted">{t('mgr.impact.intro')}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={t('mgr.impact.saved')}
          value={formatINRCompact(tally.rupeesSaved)}
          sub={
            delta > 0 ? (
              <span role="status" className="font-semibold text-green">
                {t('mgr.impact.sinceOpened', { value: formatINR(delta) })}
              </span>
            ) : undefined
          }
        />
        <KpiTile
          label={t('mgr.impact.kept')}
          value={formatNumber(tally.unitsKeptFromDestruction)}
          sub={<PackageCheck size={18} aria-hidden="true" className="text-green" />}
        />
        <KpiTile
          label={t('mgr.impact.packaging')}
          value={`${dec1.format(tally.packagingKg)} kg`}
          sub={<Recycle size={18} aria-hidden="true" className="text-green" />}
        />
        <KpiTile
          label={t('mgr.impact.trips')}
          value={formatNumber(tally.reverseTripsAvoided)}
          sub={<Truck size={18} aria-hidden="true" className="text-green" />}
          note={<span className="text-muted">{t('mgr.impact.tripsSub')}</span>}
        />
      </dl>

      <div className="card mt-4 flex items-start gap-3 p-4">
        <Trophy size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
        <div>
          <h2 className="text-xl">{t('mgr.impact.outcomesTitle')}</h2>
          <p className="mt-1">
            {t('mgr.impact.repLine', { rep: m.data.meta.repName, saved: formatINRCompact(tally.rupeesSaved), n: k.resolved.resolvedInTime })}
          </p>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <h2 className="text-2xl">{t('mgr.impact.chartTitle')}</h2>
        <div className="mt-3">
          <RouteBars title={t('mgr.impact.chartTitle')} rows={routes.map((r) => ({ label: t(`rung.${r.route}`), value: Math.round(r.rupeesSaved) }))} />
        </div>
        <h3 className="mt-4 font-body text-base font-semibold">{t('mgr.impact.byRoute')}</h3>
        <table className="mt-1 w-full table-fixed text-left text-sm [&_th]:[overflow-wrap:anywhere]">
          <thead>
            <tr className="text-muted">
              <th className="w-[40%] py-1 font-semibold">{t('mgr.impact.route')}</th>
              <th className="py-1 pl-3 text-right font-semibold">{t('mgr.impact.units')}</th>
              <th className="py-1 pl-3 text-right font-semibold">{t('mgr.impact.rupees')}</th>
              <th className="py-1 pl-3 text-right font-semibold">{t('mgr.impact.kg')}</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.route} className="border-t">
                <td className="py-1.5">{t(`rung.${r.route}`)}</td>
                <td className="py-1.5 pl-3 text-right">{formatNumber(r.units)}</td>
                <td className="py-1.5 pl-3 text-right">{formatINR(r.rupeesSaved)}</td>
                <td className="py-1.5 pl-3 text-right">{dec1.format(r.packagingKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-1 text-sm text-muted">
        <li className="flex items-start gap-2">
          <Leaf size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {tally.co2Kg == null ? t('mgr.impact.co2') : `CO₂: ${dec1.format(tally.co2Kg)} kg`}
        </li>
        <li>{t('mgr.impact.packagingNote')}</li>
      </ul>
    </section>
  );
}
