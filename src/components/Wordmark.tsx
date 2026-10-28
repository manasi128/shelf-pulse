import { useTranslation } from 'react-i18next';
import { BRAND } from '../config/brand';

/**
 * Official wordmark when provided (see public/brand/README.md); otherwise the product name
 * in bold tracked capitals with a small decorative gradient mark. Sits on the black header band.
 */
export default function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { t } = useTranslation();
  const lg = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      {BRAND.hasWordmark && <img src={BRAND.wordmarkInverse} alt="" className={lg ? 'h-7' : 'h-5'} />}
      <span aria-hidden="true" className={`brand-mark inline-block shrink-0 rounded-pill ${lg ? 'h-4 w-4' : 'h-3 w-3'}`} />
      <span className={`font-heading font-bold uppercase whitespace-nowrap leading-none tracking-[0.14em] ${lg ? 'text-2xl' : 'text-base'}`}>
        {t('app.name')}
      </span>
    </span>
  );
}
