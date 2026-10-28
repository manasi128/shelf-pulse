import { CircleCheck, Clock, OctagonAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type Status = 'green' | 'amber' | 'red';

const STYLES: Record<Status, { icon: typeof CircleCheck; cls: string }> = {
  green: { icon: CircleCheck, cls: 'bg-green-soft text-green border-green' },
  amber: { icon: Clock, cls: 'bg-amber-soft text-amber border-amber' },
  red: { icon: OctagonAlert, cls: 'bg-red-soft text-red border-red' },
};

/** Status is always icon + colour + word. Never colour alone. */
export default function StatusPill({ status }: { status: Status }) {
  const { t } = useTranslation();
  const { icon: Icon, cls } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill hairline px-2.5 py-0.5 font-body text-sm font-semibold ${cls}`}
    >
      <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
