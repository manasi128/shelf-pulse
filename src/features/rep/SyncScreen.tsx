import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { liveAiAvailable, setAiMode, useAiMode } from '../../ai/settings';
import type { AiMode } from '../../ai/types';
import { clearSavedBaseline } from '../manager/baseline';
import { useTranslation } from 'react-i18next';
import { db, loadSeed } from '../../data/db';
import { useSyncState } from '../../data/hooks';
import { setForceOffline } from '../../data/repo';
import { deviceOnline, MockTransport, syncNow } from '../../data/sync';

const transport = new MockTransport(deviceOnline(db));

/** What is saved, what is waiting to send, and demo controls. */
export default function SyncScreen() {
  const { t } = useTranslation();
  const s = useSyncState();
  const mode = useAiMode();
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode === 'live') void liveAiAvailable().then(setLive);
  }, [mode]);
  if (!s) return <p className="p-6 text-muted">{t('common.loading')}</p>;

  return (
    <section className="px-4 py-6">
      <h1 className="text-4xl">{t('sync.title')}</h1>

      <div className="card mt-5 p-4">
        <p className="flex items-center gap-2 text-lg font-semibold" role="status">
          {s.pending > 0 ? (
            <>
              <RefreshCw size={20} aria-hidden="true" className="text-amber" />
              {t('sync.pending', { count: s.pending })}
            </>
          ) : (
            <>
              <ShieldCheck size={20} aria-hidden="true" className="text-green" />
              {t('sync.allSent')}
            </>
          )}
        </p>
        {s.pending > 0 && s.lastError === 'offline' && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <CloudOff size={16} aria-hidden="true" />
            {t('sync.waitingForNetwork')}
          </p>
        )}
        <p className="mt-2 text-sm">{t('sync.savedLocally')}</p>
        <p className="mt-1 text-sm text-muted">{t('sync.sentTotal', { count: s.synced })}</p>
        <button
          type="button"
          className="tap mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary"
          onClick={() => void syncNow(db, transport)}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {t('sync.sendNow')}
        </button>
      </div>

      <fieldset className="card mt-4 p-4">
        <legend className="sr-only">{t('ai.title')}</legend>
        <p aria-hidden="true" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={20} aria-hidden="true" className="text-accent" />
          {t('ai.title')}
        </p>
        <p className="mt-1 text-sm text-muted">{t('ai.intro')}</p>
        <div className="mt-2 space-y-1">
          {(['off', 'mock', 'live'] as AiMode[]).map((m) => (
            <label key={m} className="tap flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="ai-mode"
                className="h-5 w-5 accent-[var(--color-accent)]"
                checked={mode === m}
                onChange={() => setAiMode(m)}
              />
              <span>{t(`ai.mode_${m}`)}</span>
            </label>
          ))}
        </div>
        {mode === 'live' && live != null && (
          <p role="status" className={`mt-2 text-sm ${live ? 'text-green' : 'text-amber'}`}>
            {live ? t('ai.liveReady') : t('ai.liveMissing')}
          </p>
        )}
      </fieldset>

      <div className="card mt-4 p-4">
        <label className="tap flex cursor-pointer items-center justify-between gap-3">
          <span className="font-semibold">{t('sync.simulateOffline')}</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--color-accent)]"
            checked={s.forceOffline}
            onChange={(e) => void setForceOffline(db, e.target.checked)}
          />
        </label>
        <button
          type="button"
          className="tap mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md hairline border-line-strong px-4 cta"
          onClick={() => {
            if (window.confirm(t('sync.resetConfirm'))) {
              clearSavedBaseline();
              void loadSeed(db);
            }
          }}
        >
          <RotateCcw size={18} aria-hidden="true" />
          {t('sync.resetDemo')}
        </button>
      </div>
    </section>
  );
}
