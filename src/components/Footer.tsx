import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="px-4 py-5 text-center text-xs text-muted border-t">
      <p className="mx-auto max-w-prose">{t('footer.disclaimer')}</p>
    </footer>
  );
}
