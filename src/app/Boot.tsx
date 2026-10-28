import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { db, ensureSeeded } from '../data/db';
import { deviceOnline, MockTransport, startAutoSync } from '../data/sync';

/** Loads the example data into the offline store on first run, then starts background sync. */
export default function Boot({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stop: (() => void) | undefined;
    void ensureSeeded(db).then(() => {
      setReady(true);
      stop = startAutoSync(db, new MockTransport(deviceOnline(db)));
    });
    return () => stop?.();
  }, []);
  if (!ready) return <p className="p-6 text-muted">{t('common.loading')}</p>;
  return <>{children}</>;
}
