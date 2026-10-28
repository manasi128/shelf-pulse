import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MANUAL_SIGNALS, type SignalId } from '../../../logic';

/** Tap-to-toggle signals. The auto signal shows as a fixed chip when present. */
export default function SignalChips(props: { active: readonly SignalId[]; onToggle: (s: SignalId) => void }) {
  const { t } = useTranslation();
  const { active, onToggle } = props;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {MANUAL_SIGNALS.map((s) => {
        const on = active.includes(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(s)}
            className={`tap inline-flex items-center gap-1 rounded-pill hairline px-3 py-1 text-sm ${
              on ? 'border-amber bg-amber-soft font-semibold text-amber' : 'border-line bg-raised text-ink'
            }`}
          >
            {on && <Check size={14} aria-hidden="true" />}
            {t(`signal.${s}`)}
          </button>
        );
      })}
      {active.includes('same_batch_no_sales') && (
        <span className="inline-flex items-center gap-1 rounded-pill hairline border-amber bg-amber-soft px-3 py-1 text-sm font-semibold text-amber">
          {t('signal.same_batch_no_sales')}
        </span>
      )}
    </div>
  );
}
