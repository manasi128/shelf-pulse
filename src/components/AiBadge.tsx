import { BookOpenCheck, FlaskConical, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AiSource } from '../ai/types';

/** Says where a suggestion came from, and how sure it is when that is meaningful. */
export default function AiBadge({ source, confidence }: { source: AiSource; confidence?: number }) {
  const { t } = useTranslation();
  const Icon = source === 'live' ? Sparkles : source === 'mock' ? FlaskConical : BookOpenCheck;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
      <Icon size={14} aria-hidden="true" className={source === 'live' ? 'text-accent' : ''} />
      {t(`ai.src_${source}`)}
      {source !== 'rules' && confidence != null && <> · {t('ai.sure', { pct: Math.round(confidence * 100) })}</>}
    </span>
  );
}
