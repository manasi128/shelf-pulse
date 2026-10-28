import type { ReactNode } from 'react';

/** A headline number with its label and one line of context. */
export default function KpiTile(props: { label: string; value: ReactNode; sub?: ReactNode; note?: ReactNode }) {
  return (
    <div className="card p-4">
      <dt className="text-sm text-muted">{props.label}</dt>
      <dd className="mt-1 font-heading text-4xl font-bold leading-none">{props.value}</dd>
      {props.sub && <dd className="mt-2 text-sm">{props.sub}</dd>}
      {props.note && <dd className="mt-1 text-sm">{props.note}</dd>}
    </div>
  );
}
