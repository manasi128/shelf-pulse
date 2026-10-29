import { CalendarClock, Hourglass, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LineView } from '../data/derive';
import { formatDate, formatDays } from '../i18n/format';

/** Act-by, days to sell and sales since last visit, in plain words. */
export default function LineFacts({ view }: { view: LineView }) {
  const { t } = useTranslation();
  const e = view.evaluation;
  const actBy =
    e.actBy == null
      ? t('line.noActBy')
      : (e.daysToActBy ?? 0) < 0
        ? t('line.actByPassed', { date: formatDate(e.actBy) })
        : t('line.actBy', { date: formatDate(e.actBy) });
  return (
    <ul className="mt-2 grid gap-1 text-sm">
      <li className={`flex items-center gap-2 ${e.status !== 'green' ? 'font-semibold' : ''}`}>
        <CalendarClock size={16} aria-hidden="true" className="shrink-0" />
        {actBy}
      </li>
      <li className="flex items-center gap-2">
        <Hourglass size={16} aria-hidden="true" className="shrink-0" />
        {Number.isFinite(e.cover) ? t('line.cover', { n: formatDays(e.cover) }) : t('line.coverNever')}
        <span className="text-muted">· {t('line.life', { n: formatDays(e.lifeLeft) })}</span>
      </li>
      {!view.counted && (
        <li className="text-xs text-muted">{t('line.fromLastCount', { date: formatDate(view.line.visits[view.line.visits.length - 1].date) })}</li>
      )}
      {view.counted && (
        <li className="flex items-center gap-2">
          <ShoppingBag size={16} aria-hidden="true" className="shrink-0" />
          {t('line.sold', { n: e.salesSinceLast })}
        </li>
      )}
    </ul>
  );
}
