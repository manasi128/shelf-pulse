import type { TFunction } from 'i18next';
import { formatINRCompact, formatNumber, formatPct } from '../../i18n/format';
import type { Kpis } from '../../data/manager';

/** Template weekly summary from the numbers, in the manager's language. Leads with outcomes. */
export function summaryFacts(k: Kpis, openFlags: number, category: { name: string; outlets: number }[]) {
  return {
    resolvedInTime: k.resolved.resolvedInTime,
    flagsClosed: k.resolved.closed,
    savedFromWaste: formatINRCompact(k.tally.rupeesSaved),
    unitsKeptFromDestruction: k.tally.unitsKeptFromDestruction,
    returnExpiryRate: `${k.returnRatePct.toFixed(1)}%`,
    controlReturnExpiryRate: `${k.controlReturnRatePct.toFixed(1)}%`,
    mustSellOnShelf: formatPct(k.mustSellOsa),
    loadingIndexPoints: k.loadingIndexPts,
    openFlags,
    categoryReview: category.map((c) => `${c.name} red in ${c.outlets} outlets`).join('; ') || 'none',
  };
}

export function templateSummary(t: TFunction, k: Kpis, openFlags: number, category: { name: string; outlets: number }[]) {
  return [
    t('mgr.summary.resolved', { n: k.resolved.resolvedInTime, closed: k.resolved.closed }),
    t('mgr.summary.saved', { saved: formatINRCompact(k.tally.rupeesSaved), units: formatNumber(k.tally.unitsKeptFromDestruction) }),
    t('mgr.summary.rate', { rate: `${k.returnRatePct.toFixed(1)}%`, control: `${k.controlReturnRatePct.toFixed(1)}%` }),
    t('mgr.summary.osa', { osa: formatPct(k.mustSellOsa) }),
    ...category.map((c) => t('mgr.summary.category', { sku: c.name, n: c.outlets })),
    openFlags > 0 ? t('mgr.summary.open', { count: openFlags }) : '',
  ]
    .filter(Boolean)
    .join(' ');
}
