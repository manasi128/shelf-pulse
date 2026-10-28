import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Big one-thumb +/− counter. Shows the last count as a hint until the rep counts. */
export default function Stepper(props: { value: number | undefined; hint: number; name: string; onChange: (n: number) => void }) {
  const { t } = useTranslation();
  const { value, hint, name, onChange } = props;
  const base = value ?? hint;
  const btn = 'tap flex h-14 w-14 items-center justify-center rounded-md hairline border-line-strong bg-raised active:bg-surface';
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} aria-label={t('count.less', { name })} onClick={() => onChange(Math.max(0, base - 1))}>
        <Minus size={24} aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        aria-label={t('count.countOf', { name })}
        className={`h-14 w-20 rounded-md hairline border-line-strong bg-raised text-center text-2xl font-semibold ${
          value == null ? 'text-muted' : 'text-ink'
        }`}
        value={value ?? ''}
        placeholder={String(hint)}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
      <button type="button" className={btn} aria-label={t('count.more', { name })} onClick={() => onChange(base + 1)}>
        <Plus size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
