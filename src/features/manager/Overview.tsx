import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Bell, CircleCheckBig, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAi } from '../../ai/useAi';
import type { AiSource } from '../../ai/types';
import AiBadge from '../../components/AiBadge';
import KpiTile from '../../components/KpiTile';
import TrendChart from '../../components/charts/TrendChart';
import { flagQueue, kpis, territory } from '../../data/manager';
import { formatINRCompact, formatPct } from '../../i18n/format';
import { summaryFacts, templateSummary } from './summary';
import { useManager } from './useManager';
import { savedBaseline } from './baseline';

/** The week at a glance: summary, key numbers, and the return-rate trend against control. */
export default function Overview() {
  const { t, i18n } = useTranslation();
  const m = useManager();
  const ai = useAi();
  const [aiText, setAiText] = useState<{ text: string; source: AiSource; lang: string } | null>(null);
  const [writing, setWriting] = useState(false);
  if (!m) return <p className="text-muted">{t('common.loading')}</p>;
  savedBaseline(m.data);

  const k = kpis(m.data, m.drafts, m.today);
  const open = flagQueue(m.data, m.drafts, m.today).length;
  const category = territory(m.data, m.drafts, m.today).category.map((c) => ({ name: `${c.sku.brand} ${c.sku.name}`, outlets: c.outlets }));
  const template = templateSummary(t, k, open, category);
  const summary = aiText && aiText.lang === i18n.language ? aiText : { text: template, source: 'rules' as AiSource };
  const loadingOk = k.loadingIndexPts <= 0;

  return (
    <section>
      <h1 className="text-4xl">{t('mgr.overview.title', { territory: m.data.meta.territory })}</h1>

      {open > 0 && (
        <Link to="flags" className="tap mt-4 flex items-center gap-3 rounded-lg hairline border-accent bg-accent-soft p-3 font-semibold">
          <Bell size={20} aria-hidden="true" className="shrink-0 text-accent" />
          <span className="flex-1">{t('mgr.overview.openFlags', { count: open })}</span>
          <span className="text-sm underline underline-offset-2">{t('mgr.overview.goToFlags')}</span>
        </Link>
      )}

      <div className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl">{t('mgr.overview.summaryTitle')}</h2>
          <AiBadge source={summary.source} />
        </div>
        <p className="mt-2 max-w-prose whitespace-pre-line" aria-live="polite">
          {summary.text}
        </p>
        {ai.mode === 'live' && (
          <button
            type="button"
            disabled={writing}
            className="tap mt-3 inline-flex items-center gap-2 rounded-md hairline border-line-strong px-4 cta disabled:opacity-70"
            onClick={async () => {
              setWriting(true);
              try {
                const r = await ai.writer.weeklySummary({
                  language: i18n.language,
                  facts: summaryFacts(k, open, category),
                  templateText: template,
                });
                setAiText({ ...r, lang: i18n.language });
              } finally {
                setWriting(false);
              }
            }}
          >
            {writing ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <Sparkles size={18} aria-hidden="true" />}
            {writing ? t('mgr.overview.writing') : t('mgr.overview.aiSummary')}
          </button>
        )}
      </div>

      <h2 className="mt-8 text-2xl">{t('mgr.overview.kpisTitle')}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label={t('mgr.kpi.returnRate')}
          value={`${k.returnRatePct.toFixed(1)}%`}
          sub={
            <span className="inline-flex items-center gap-1">
              {k.returnRateChangePct <= 0 ? (
                <ArrowDownRight size={16} aria-hidden="true" className="text-green" />
              ) : (
                <ArrowUpRight size={16} aria-hidden="true" className="text-red" />
              )}
              {`${k.returnRateChangePct > 0 ? '+' : ''}${k.returnRateChangePct.toFixed(1)} ${t('units.pts')}`}
            </span>
          }
          note={<span className="text-muted">{t('mgr.kpi.returnRateSub', { control: `${k.controlReturnRatePct.toFixed(1)}%` })}</span>}
        />
        <KpiTile label={t('mgr.kpi.atRisk')} value={formatINRCompact(k.atRisk)} sub={<span className="text-muted">{t('mgr.kpi.atRiskSub')}</span>} />
        <KpiTile
          label={t('mgr.kpi.resolved')}
          value={formatPct(k.resolved.rate)}
          sub={<span className="text-muted">{t('mgr.kpi.resolvedSub', { n: k.resolved.resolvedInTime, due: k.resolved.due })}</span>}
        />
        <KpiTile
          label={t('mgr.kpi.osa')}
          value={formatPct(k.mustSellOsa)}
          sub={
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={16} aria-hidden="true" className={k.mustSellOsa >= 0.95 ? 'text-green' : 'text-amber'} />
              {t('mgr.kpi.osaSub')}
            </span>
          }
        />
        <KpiTile
          label={t('mgr.kpi.loading')}
          value={`${k.loadingIndexPts > 0 ? '+' : ''}${k.loadingIndexPts} ${t('units.pts')}`}
          sub={
            <span className="inline-flex items-start gap-1">
              {loadingOk ? (
                <CircleCheckBig size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
              ) : (
                <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-amber" />
              )}
              {loadingOk ? t('mgr.kpi.loadingGood') : t('mgr.kpi.loadingWarn')}
            </span>
          }
          note={
            <span className="text-muted">
              {t('mgr.kpi.loadingSub', { primary: `${k.primaryGrowthPct}%`, secondary: `${k.secondaryGrowthPct}%` })}
            </span>
          }
        />
      </dl>

      <div className="card mt-6 p-4">
        <h2 className="text-2xl">{t('mgr.kpi.trendTitle')}</h2>
        <div className="mt-3">
          <TrendChart weeks={m.data.trends.weeks} pilot={m.data.trends.returnExpiryRatePct} control={m.data.trends.controlReturnExpiryRatePct} />
        </div>
      </div>
    </section>
  );
}
