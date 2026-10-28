import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n/format';
import { chart } from './chartTheme';

/** Pilot vs control return-and-expiry rate. Legend + end labels, so identity is never colour alone. */
export default function TrendChart(props: { weeks: string[]; pilot: number[]; control: number[] }) {
  const { t } = useTranslation();
  const rows = props.weeks.map((w, i) => ({ week: formatDate(w), pilot: props.pilot[i], control: props.control[i] }));
  const pct = (v: number) => `${v.toFixed(1)}%`;
  const last = rows.length - 1;
  const endLabel = (key: 'pilot' | 'control', color: string) =>
    function EndLabel(p: { x?: number; y?: number; index?: number }) {
      if (p.index !== last || p.x == null || p.y == null) return <g />;
      return (
        <text x={p.x + 8} y={p.y + 4} fontSize={12} fontWeight={600} fill="var(--color-ink)">
          <tspan fill={color}>●</tspan> {pct(rows[last][key])}
        </text>
      );
    };

  return (
    <figure>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t('mgr.kpi.trendTitle')}>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0.5 w-5 rounded" style={{ background: chart.series1 }} />
          {t('mgr.kpi.pilot')}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0.5 w-5 rounded" style={{ background: chart.series2 }} />
          {t('mgr.kpi.control')}
        </li>
      </ul>
      <div className="h-60 w-full" role="img" aria-label={`${t('mgr.kpi.trendTitle')}: ${t('mgr.kpi.pilot')} ${pct(rows[0].pilot)} → ${pct(rows[last].pilot)}; ${t('mgr.kpi.control')} ${pct(rows[0].control)} → ${pct(rows[last].control)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 56, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            <XAxis dataKey="week" tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={44} domain={[1.5, 3]} ticks={[1.5, 2, 2.5, 3]} tickFormatter={pct} />
            <Tooltip {...chart.tooltip} formatter={(v: number) => pct(v)} cursor={{ stroke: chart.axis, strokeWidth: 1 }} />
            <Line type="monotone" dataKey="pilot" name={t('mgr.kpi.pilot')} stroke={chart.series1} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-surface-raised)', fill: chart.series1 }} activeDot={{ r: 6 }} label={endLabel('pilot', chart.series1)} isAnimationActive={false} />
            <Line type="monotone" dataKey="control" name={t('mgr.kpi.control')} stroke={chart.series2} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-surface-raised)', fill: chart.series2 }} activeDot={{ r: 6 }} label={endLabel('control', chart.series2)} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="tap flex cursor-pointer items-center font-semibold">{t('mgr.kpi.showTable')}</summary>
        <table className="mt-1 w-full table-fixed text-left [&_th]:[overflow-wrap:anywhere]">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-semibold">{t('mgr.kpi.week')}</th>
              <th className="py-1 pl-3 text-right font-semibold">{t('mgr.kpi.pilot')}</th>
              <th className="py-1 pl-3 text-right font-semibold">{t('mgr.kpi.control')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.week} className="border-t">
                <td className="py-1">{r.week}</td>
                <td className="py-1 pl-3 text-right">{pct(r.pilot)}</td>
                <td className="py-1 pl-3 text-right">{pct(r.control)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
