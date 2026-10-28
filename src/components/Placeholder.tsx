import { useTranslation } from 'react-i18next';

export default function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <section className="px-4 py-6">
      <h1 className="text-3xl">{t(titleKey)}</h1>
      <p className="mt-2 text-muted">{t('common.buildingNext')}</p>
    </section>
  );
}
