import { useTranslation } from 'react-i18next';
import type { RankReason } from '../logic';
import { formatINR } from '../i18n/format';

/** One plain-words reason why an outlet is high on today's list. */
export default function ReasonText({ reason }: { reason: RankReason }) {
  const { t } = useTranslation();
  switch (reason.code) {
    case 'act_by_soon':
      if (reason.days < 0) return <>{t('reason.act_by_passed')}</>;
      if (reason.days === 0) return <>{t('reason.act_by_today')}</>;
      return <>{t('reason.act_by_soon', { count: reason.days })}</>;
    case 'value_at_risk':
      return <>{t('reason.value_at_risk', { value: formatINR(reason.rupees) })}</>;
    default:
      return <>{t(`reason.${reason.code}`, { count: reason.count })}</>;
  }
}
