import { Link, useNavigate } from 'react-router-dom';
import { CircleCheckBig, Flag as FlagIcon, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../data/db';
import { orderForOutlet } from '../../../data/derive';
import { completeVisit } from '../../../data/repo';
import { formatINR, formatPct } from '../../../i18n/format';
import SkuName from '../../../components/SkuName';
import { useOutletVisit } from './useOutletVisit';

/** Suggested order: keeps value, adds no slow stock. */
export default function Order() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const v = useOutletVisit();
  if (!v) return null;
  const order = orderForOutlet(v.data, v.outlet.id, v.drafts, v.today);
  const sku = (id: string) => v.data.skus.find((s) => s.id === id)!;
  const buy = order.lines.filter((l) => l.qty > 0);
  const held = order.lines.filter((l) => l.reason === 'held_amber' || l.reason === 'held_red');

  return (
    <section className="px-4 py-5">
      <h1 className="text-3xl">{t('order.title')}</h1>

      <dl className="card mt-4 grid grid-cols-2 gap-3 p-4">
        <div>
          <dt className="text-sm text-muted">{t('order.kept')}</dt>
          <dd className="font-heading text-4xl font-bold text-accent">{formatPct(order.valueKeptRatio)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('order.slowAdded')}</dt>
          <dd className="flex items-center gap-1.5 font-heading text-4xl font-bold text-green">
            {order.slowStockAdded}
            <CircleCheckBig size={22} aria-hidden="true" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('order.usual')}</dt>
          <dd className="font-semibold">{formatINR(order.usualValue)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('order.suggested')}</dt>
          <dd className="font-semibold">{formatINR(order.suggestedValue)}</dd>
        </div>
      </dl>

      <ul className="mt-4 divide-y rounded-lg hairline">
        {buy.map((l) => (
          <li key={l.skuId} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <SkuName sku={sku(l.skuId)} as="p" />
              <p className="text-sm text-muted">{t(`order.reason.${l.reason}`)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold">{t('order.units', { n: l.qty })}</p>
              <p className="text-sm text-muted">{formatINR(l.value)}</p>
            </div>
          </li>
        ))}
      </ul>

      {held.length > 0 && (
        <>
          <h2 className="mt-5 text-xl">{t('order.held')}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {held.map((l) => (
              <li key={l.skuId} className="flex items-center gap-2">
                <FlagIcon size={14} aria-hidden="true" className={l.reason === 'held_red' ? 'text-red' : 'text-amber'} />
                <span className="font-semibold">{sku(l.skuId).name}</span>
                <span className="text-muted">· {t(`order.reason.${l.reason}`)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link to="../share" relative="path" className="tap mt-6 flex w-full items-center justify-center gap-2 rounded-md hairline border-line-strong px-4 cta">
        <Share2 size={18} aria-hidden="true" />
        {t('order.share')}
      </Link>
      <button
        type="button"
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary"
        onClick={async () => {
          await completeVisit(db, { outletId: v.outlet.id, today: v.today });
          navigate('/rep');
        }}
      >
        <CircleCheckBig size={20} aria-hidden="true" />
        {t('order.finish')}
      </button>
    </section>
  );
}
