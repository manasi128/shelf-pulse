/** Chart styling from design tokens: thin marks, recessive solid hairline grid, text in ink tokens. */
export const chart = {
  series1: 'var(--chart-1)',
  series2: 'var(--chart-2)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
  tooltip: {
    contentStyle: {
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-line)',
      borderRadius: 8,
      color: 'var(--color-ink)',
      fontSize: 13,
    },
    labelStyle: { color: 'var(--color-ink)', fontWeight: 600 },
    itemStyle: { color: 'var(--color-ink)' },
  },
};
