import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '../../i18n/format';
import { chart } from './chartTheme';

/** One series (₹ saved) per recovery route: thin horizontal bars, values labelled at the end. */
export default function RouteBars(props: { rows: { label: string; value: number }[]; title: string }) {
  const height = Math.max(120, props.rows.length * 40 + 24);
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={`${props.title}: ${props.rows.map((r) => `${r.label} ${formatINR(r.value)}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.rows} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap={10}>
          <CartesianGrid stroke={chart.grid} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={130} tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} />
          <Tooltip {...chart.tooltip} formatter={(v: number) => formatINR(v)} cursor={{ fill: 'var(--color-surface)' }} />
          <Bar dataKey="value" fill={chart.series1} barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: number) => formatINR(v)} style={{ fill: 'var(--color-ink)', fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
