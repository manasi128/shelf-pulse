import { useId, useRef, useState } from 'react';
import { Check, Loader2, Mic, Square, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAi } from '../../../ai/useAi';
import { listen, speechSupported } from '../../../ai/speech';
import type { VoiceExtraction } from '../../../ai/types';
import { db } from '../../../data/db';
import { setAnswers, toggleSignal } from '../../../data/repo';
import AiBadge from '../../../components/AiBadge';
import type { OutletVisit } from './useOutletVisit';

/** Voice note → suggested signals and retailer asks. Nothing is applied until the rep taps Apply. */
export default function VoiceNote({ v }: { v: OutletVisit }) {
  const { t, i18n } = useTranslation();
  const ai = useAi();
  const transcriptId = useId();
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VoiceExtraction | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const stopRef = useRef<() => void>(() => {});
  if (!ai.voice) return null;

  const useMic = ai.mode === 'live' && speechSupported();
  const onList = new Set(v.lines.map((l) => l.sku.id));
  const ref = (id: string) => {
    const s = v.data.skus.find((x) => x.id === id)!;
    return { skuId: s.id, brand: s.brand, name: s.name };
  };
  const skuName = (id: string) => {
    const s = v.data.skus.find((x) => x.id === id);
    return s ? `${s.brand} · ${s.name}` : id;
  };

  function record() {
    setResult(null);
    if (!useMic) {
      setTranscript(t('voice.sample'));
      return;
    }
    setListening(true);
    stopRef.current = listen(i18n.language, setTranscript, () => setListening(false));
  }

  async function extract() {
    if (!ai.voice || !transcript.trim()) return;
    setBusy(true);
    try {
      setResult(
        await ai.voice.extract({
          transcript,
          language: i18n.language,
          redList: v.lines.map((l) => ref(l.sku.id)),
          offList: v.data.skus.filter((s) => !onList.has(s.id)).map((s) => ref(s.id)),
        }),
      );
      setApplied(new Set());
    } finally {
      setBusy(false);
    }
  }

  const asks = v.draft?.answers.rangeAsks ?? v.outlet.rangeAsks;
  const has = (skuId: string, signal: string) => (v.draft?.signals[skuId] ?? []).includes(signal as never);

  async function applySignal(skuId: string, signal: VoiceExtraction['signals'][number]['signal'], key: string) {
    if (!has(skuId, signal)) await toggleSignal(db, { outletId: v.outlet.id, skuId, signal, today: v.today });
    setApplied((s) => new Set(s).add(key));
  }
  async function applyAsk(skuId: string, key: string) {
    if (!asks.includes(skuId)) {
      await setAnswers(db, { outletId: v.outlet.id, today: v.today, answers: { rangeAsks: [...asks, skuId] } });
    }
    setApplied((s) => new Set(s).add(key));
  }

  const btn = 'tap inline-flex items-center justify-center gap-2 rounded-md px-4 cta';
  const items = result
    ? [
        ...result.signals.map((s, i) => ({
          key: `s${i}`,
          label: `${t(`signal.${s.signal}`)} · ${skuName(s.skuId)}`,
          quote: s.quote,
          confidence: s.confidence,
          apply: (k: string) => applySignal(s.skuId, s.signal, k),
        })),
        ...result.rangeAsks.map((a, i) => ({
          key: `a${i}`,
          label: t('voice.rangeAsk', { sku: skuName(a.skuId) }),
          quote: a.quote,
          confidence: a.confidence,
          apply: (k: string) => applyAsk(a.skuId, k),
        })),
      ]
    : [];

  return (
    <div className="card p-3">
      <h2 className="flex items-center gap-2 text-xl">
        <Mic size={20} aria-hidden="true" />
        {t('voice.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('voice.intro')}</p>
      {!useMic && <p className="mt-1 text-xs text-muted">{t('voice.demoNote')}</p>}

      {listening ? (
        <button type="button" className={`${btn} mt-3 w-full bg-red text-on-primary`} onClick={() => stopRef.current()}>
          <Square size={18} aria-hidden="true" />
          {t('voice.stop')}
          <span className="sr-only" role="status">
            {t('voice.listening')}
          </span>
        </button>
      ) : (
        <button type="button" className={`${btn} mt-3 w-full hairline border-line-strong`} onClick={record}>
          <Mic size={18} aria-hidden="true" />
          {t('voice.record')}
        </button>
      )}

      {(transcript || listening) && (
        <>
          <label htmlFor={transcriptId} className="mt-3 block text-sm font-semibold">
            {t('voice.transcript')}
          </label>
          <textarea
            id={transcriptId}
            rows={3}
            className="mt-1 w-full rounded-md hairline border-line-strong bg-raised p-2"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <button
            type="button"
            className={`${btn} mt-2 w-full bg-primary text-on-primary disabled:opacity-70`}
            disabled={busy || listening || !transcript.trim()}
            onClick={() => void extract()}
          >
            {busy ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <Wand2 size={18} aria-hidden="true" />}
            {busy ? t('voice.extracting') : t('voice.extract')}
          </button>
        </>
      )}

      {result && (
        <div className="mt-3" role="status">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{t('voice.suggestions')}</p>
            <AiBadge source={result.source} />
          </div>
          {items.length === 0 && <p className="mt-1 text-sm">{t('voice.none')}</p>}
          <ul className="mt-2 space-y-2">
            {items.map((it) => (
              <li key={it.key} className="rounded-md bg-surface p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{it.label}</p>
                    <p className="text-xs text-muted">“{it.quote}” · {t('ai.sure', { pct: Math.round(it.confidence * 100) })}</p>
                  </div>
                  {applied.has(it.key) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-green">
                      <Check size={16} aria-hidden="true" />
                      {t('voice.applied')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="tap shrink-0 rounded-md hairline border-line-strong px-3 text-sm font-semibold"
                      onClick={() => void it.apply(it.key)}
                    >
                      {t('voice.apply')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
