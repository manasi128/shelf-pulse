import { useEffect, useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSyncState } from '../data/hooks';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function SyncChip() {
  const { t } = useTranslation();
  const sync = useSyncState();
  const online = useOnline() && !sync?.forceOffline;
  const Icon = online ? Cloud : CloudOff;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm">
      <Icon size={18} aria-hidden="true" />
      <span className="whitespace-nowrap">{t(online ? 'sync.online' : 'sync.offlineShort')}</span>
    </span>
  );
}
