import { CalendarClock, OctagonX, Sparkles, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEMO_TODAY } from '../../config/demo';
import { db } from '../../data/db';
import { outletLines } from '../../data/derive';
import { useDataset, useDrafts, useGodownChecked } from '../../data/hooks';
import { setGodownChecked } from '../../data/repo';
import { THRESHOLDS } from '../../config/thresholds';
import { daysOfLifeLeft, forecastRate, ratesNewestFirst, salesNewestFirst, seedLaunchOutlets } from '../../logic';
import { formatDate, formatDays } from '../../i18n/format';
import SkuName from '../../components/SkuName';

/** Weekly distributor godown check: oldest batches first, routed to the fastest shops. */
export default function Godown() {
  const { t } = useTranslation();
  const data = useDataset();
  const drafts = useDrafts();
  const checked = useGodownChecked();
  if (!data || !drafts || !checked) return <p className="p-6 text-muted">{t('common.loading')}</p>;

  const today = DEMO_TODAY;
  const views = data.outlets.flatMap((o) => outletLines(data, o.id, drafts, today));
  const name = (id: string) => data.outlets.find((o) => o.id === id)?.name ?? id;
  const batches = [...data.godown].sort((a, b) => a.expiry.localeCompare(b.expiry));
  const oldestBySku = new Map<string, string>();
  for (const b of batches) if (!oldestBySku.has(b.skuId)) oldestBySku.set(b.skuId, b.id);

  return (
    <section className="px-4 py-6">
      <h1 className="text-4xl">{t('godown.title')}</h1>
      <p className="mt-2 text-muted">{t('godown.intro', { distributor: data.meta.distributor })}</p>

      <ul className="mt-5 space-y-3">
        {batches.map((b) => {
          const sku = data.skus.find((s) => s.id === b.skuId)!;
          const life = daysOfLifeLeft(b.expiry, today);
          const tooShort = life < THRESHOLDS.actBy.receiverMinShelfLifeDays + THRESHOLDS.actBy.transferLeadDays;
          const stopAt = views.filter((v) => v.sku.id === b.skuId && v.batchNow === b.batch && v.evaluation.status === 'red');
          const fastest =
            oldestBySku.get(b.skuId) === b.id && !sku.limitedEdition && !tooShort
              ? views
                  .filter((v) => v.sku.id === b.skuId && v.evaluation.status === 'green' && v.evaluation.forecastRate > 0)
                  .sort((x, y) => y.evaluation.forecastRate - x.evaluation.forecastRate)
                  .slice(0, 2)
              : [];
          const seedTo = sku.limitedEdition
            ? seedLaunchOutlets(
                data.lines
                  .filter((l) => data.skus.find((s) => s.id === l.skuId)?.category === sku.category)
                  .map((l) => ({
                    outletId: l.outletId,
                    categoryRatePerDay: forecastRate(ratesNewestFirst(l.visits)),
                    recentVisitSales: salesNewestFirst(l.visits),
                  })),
              ).slice(0, 3)
            : [];
          const isChecked = b.id in checked;
          return (
            <li key={b.id} className="card p-3">
              <SkuName sku={sku} as="h2" />
              <p className="mt-1 font-mono text-sm">
                {t('line.batch', { code: b.batch })} · {t('godown.units', { n: b.units })}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <CalendarClock size={16} aria-hidden="true" />
                {formatDate(b.expiry)} · {t('godown.daysLeft', { n: formatDays(life) })}
              </p>
              {stopAt.length > 0 && (
                <p className="mt-2 flex items-start gap-2 rounded-md bg-red-soft p-2 text-sm font-semibold text-red">
                  <OctagonX size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {t('godown.stop', { outlets: stopAt.map((v) => name(v.line.outletId)).join(', ') })}
                </p>
              )}
              {tooShort && <p className="mt-2 text-sm font-semibold">{t('godown.tooShort')}</p>}
              {fastest.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <Truck size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {t('godown.fastest', { outlets: fastest.map((v) => name(v.line.outletId)).join(', ') })}
                </p>
              )}
              {seedTo.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <Sparkles size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
                  {t('godown.seed', { outlets: seedTo.map(name).join(', ') })}
                </p>
              )}
              <label className="tap mt-2 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-[var(--color-accent)]"
                  checked={isChecked}
                  onChange={(e) => void setGodownChecked(db, { batchId: b.id, checked: e.target.checked, today })}
                />
                <span className="font-semibold">{isChecked ? t('godown.checked') : t('godown.markChecked')}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
