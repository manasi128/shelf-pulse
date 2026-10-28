import type { Sku } from '../data/schema';

/** Brand on top, product below. Product names stay as printed on the pack. */
export default function SkuName({ sku, as: Tag = 'h3' }: { sku: Sku; as?: 'h2' | 'h3' | 'p' }) {
  return (
    <Tag className="min-w-0 font-body text-base font-normal leading-snug">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{sku.brand}</span>
      <span className="block font-semibold">{sku.name}</span>
    </Tag>
  );
}
