import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Camera, Loader2, ScanLine, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAi } from '../../../ai/useAi';
import ImagePicker from '../../../components/ImagePicker';
import { db } from '../../../data/db';
import { applyCounts, setCount, toggleSignal } from '../../../data/repo';
import StatusPill from '../../../components/StatusPill';
import SkuName from '../../../components/SkuName';
import Stepper from '../../../components/Stepper';
import LineFacts from '../../../components/LineFacts';
import SignalChips from './SignalChips';
import AiBadge from '../../../components/AiBadge';
import type { AiSource } from '../../../ai/types';
import { useOutletVisit } from './useOutletVisit';

function useElapsed(since: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return null;
  const s = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Red-list count: shelf photo pre-fills, big steppers adjust, status updates live. */
export default function Count() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  const [busy, setBusy] = useState(false);
  const [confidence, setConfidence] = useState<Record<string, { conf: number; source: AiSource }>>({});
  const elapsed = useElapsed(v?.draft?.startedAt);
  const ai = useAi();
  const shelf = ai.shelf;
  const needsImage = ai.mode === 'live';
  if (!v) return null;
  const { outlet, lines, draft, today } = v;

  async function snapPhoto(image?: Blob) {
    if (!shelf) return;
    setBusy(true);
    try {
      const items = await shelf.readShelf({ outletId: outlet.id, image, skuIds: lines.map((l) => l.sku.id) });
      await applyCounts(db, {
        outletId: outlet.id,
        today,
        source: 'photo',
        counts: Object.fromEntries(items.map((i) => [i.skuId, { stock: i.stock, batch: i.batch }])),
      });
      setConfidence(Object.fromEntries(items.map((i) => [i.skuId, { conf: i.confidence, source: i.source }])));
    } finally {
      setBusy(false);
    }
  }

  async function scanBatch(skuId: string, stock: number, image?: Blob) {
    if (!shelf) return;
    const r = await shelf.readBatchCode({ outletId: outlet.id, skuId, image });
    await setCount(db, { outletId: outlet.id, skuId, stock, source: 'scan', batch: r.batch, today });
  }

  return (
    <section className="px-4 py-5">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-3xl">{t('count.title')}</h1>
        {elapsed && (
          <span className="inline-flex items-center gap-1 text-sm text-muted" aria-live="off">
            <Timer size={16} aria-hidden="true" />
            {t('count.timer', { time: elapsed })}
          </span>
        )}
      </div>

      {shelf && (
        <ImagePicker
          needsImage={needsImage}
          onPick={(image) => void snapPhoto(image)}
          disabled={busy}
          className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary disabled:opacity-70"
        >
          {busy ? <Loader2 size={22} aria-hidden="true" className="animate-spin" /> : <Camera size={22} aria-hidden="true" />}
          {busy ? t('count.photoBusy') : t('count.photo')}
        </ImagePicker>
      )}
      {Object.keys(confidence).length > 0 && (
        <p role="status" className="mt-2 text-sm">
          {t('count.photoDone')}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {lines.map((l) => {
          const c = draft?.counts[l.sku.id];
          const last = l.line.visits.at(-1)?.stock ?? 0;
          const conf = c?.source === 'photo' ? confidence[l.sku.id] : undefined;
          return (
            <li key={l.sku.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <SkuName sku={l.sku} as="h2" />
                <StatusPill status={l.evaluation.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Stepper
                  value={c?.stock}
                  hint={last}
                  name={l.sku.name}
                  onChange={(n) => void setCount(db, { outletId: outlet.id, skuId: l.sku.id, stock: n, source: 'manual', today })}
                />
                <div className="text-right text-xs text-muted">
                  <p>{t('line.lastCount', { n: last })}</p>
                  {conf != null && <AiBadge source={conf.source} confidence={conf.conf} />}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-mono">{t('line.batch', { code: l.batchNow })}</span>
                {shelf && (
                  <ImagePicker
                    needsImage={needsImage}
                    onPick={(image) => void scanBatch(l.sku.id, c?.stock ?? last, image)}
                    className="tap inline-flex items-center gap-1 rounded-md px-2 text-sm underline underline-offset-2"
                  >
                    <ScanLine size={16} aria-hidden="true" />
                    {t('count.scan')}
                  </ImagePicker>
                )}
              </div>

              {l.evaluation.needsRecount && (
                <p role="alert" className="mt-2 flex items-start gap-2 rounded-md bg-amber-soft p-2 text-sm text-amber">
                  <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {t('line.recount')}
                </p>
              )}

              <LineFacts view={l} />

              <details className="mt-2">
                <summary className="tap flex cursor-pointer items-center text-sm font-semibold">{t('count.signals')}</summary>
                <SignalChips
                  active={l.counted ? l.evaluation.signals : (draft?.signals[l.sku.id] ?? [])}
                  onToggle={(signal) => void toggleSignal(db, { outletId: outlet.id, skuId: l.sku.id, signal, today })}
                />
              </details>
            </li>
          );
        })}
      </ul>

      <Link to="../talk" relative="path" className="tap mt-5 flex w-full items-center justify-center rounded-md hairline border-line-strong px-4 cta">
        {t('count.next')}
      </Link>
    </section>
  );
}
