import { useEffect, useId, useState } from 'react';
import { Copy, Gift, Loader2, Repeat, Sparkles } from 'lucide-react';
import { useAi } from '../../../ai/useAi';
import type { AiSource } from '../../../ai/types';
import AiBadge from '../../../components/AiBadge';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type LangCode } from '../../../i18n';
import { orderForOutlet } from '../../../data/derive';
import { useOutletVisit, type OutletVisit } from './useOutletVisit';

function messageFacts(v: OutletVisit) {
  const order = orderForOutlet(v.data, v.outlet.id, v.drafts, v.today);
  const sku = (id: string) => v.data.skus.find((s) => s.id === id)!;
  const orderItems = order.lines
    .filter((l) => l.qty > 0)
    .map((l) => `${l.qty} × ${sku(l.skuId).brand} ${sku(l.skuId).name}`);
  const slow = v.lines.find((l) =>
    l.playbook?.some((s) => s.step === 'bundle_hero' && (s.state === 'next' || s.state === 'available')),
  );
  const hero = slow?.sku.heroSkuId ? sku(slow.sku.heroSkuId) : undefined;
  return { orderItems, bundle: slow && hero ? { slow: slow.sku.name, hero: `${hero.brand} ${hero.name}` } : undefined };
}

/** Template draft in the retailer's language. The rep edits and sends it; the app never sends. */
function draftMessage(v: OutletVisit, lng: LangCode, t: ReturnType<typeof useTranslation>['t']): string {
  const { orderItems, bundle } = messageFacts(v);
  const items = orderItems.map((i) => `\n• ${i}`).join('');
  return [
    t('share.msg.greeting', { lng, shop: v.outlet.name }),
    items && t('share.msg.order', { lng, items }),
    bundle && t('share.msg.bundle', { lng, slow: bundle.slow, hero: bundle.hero }),
    t('share.msg.swap', { lng }),
    t('share.msg.signoff', { lng, rep: v.data.meta.repName }),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export default function Share() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  const msgId = useId();
  const langId = useId();
  const [lng, setLng] = useState<LangCode | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<AiSource>('rules');
  const [drafting, setDrafting] = useState(false);
  const ai = useAi();
  const lang = lng ?? v?.outlet.retailerLanguage ?? 'en';

  useEffect(() => {
    if (v && text == null) setText(draftMessage(v, lang, t));
  }, [v, text, lang, t]);

  if (!v) return null;

  return (
    <section className="px-4 py-5">
      <h1 className="text-3xl">{t('share.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('share.intro')}</p>

      <div className="card mt-4 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Repeat size={18} aria-hidden="true" className="text-accent" />
          {t('share.creditTitle')}
        </p>
        <p className="mt-1 text-sm">{t('share.creditBody')}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label htmlFor={langId} className="shrink-0 text-sm font-semibold">
          {t('share.language')}
        </label>
        <select
          id={langId}
          className="tap w-full rounded-md hairline border-line-strong bg-raised px-3"
          value={lang}
          onChange={(e) => {
            const next = e.target.value as LangCode;
            setLng(next);
            setText(draftMessage(v, next, t));
            setSource('rules');
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.native}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={msgId} className="flex items-center gap-2 text-sm font-semibold">
          <Gift size={16} aria-hidden="true" />
          {t('share.messageLabel')}
        </label>
        <AiBadge source={source} />
      </div>
      <textarea
        id={msgId}
        lang={lang}
        rows={10}
        className="mt-1 w-full rounded-md hairline border-line-strong bg-raised p-3 text-base"
        value={text ?? ''}
        onChange={(e) => setText(e.target.value)}
      />
      {ai.mode === 'live' && (
        <button
          type="button"
          disabled={drafting}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-md hairline border-line-strong px-4 cta disabled:opacity-70"
          onClick={async () => {
            setDrafting(true);
            try {
              const r = await ai.writer.retailerMessage({
                language: lang,
                shop: v.outlet.name,
                repName: v.data.meta.repName,
                ...messageFacts(v),
                templateText: draftMessage(v, lang, t),
              });
              setText(r.text);
              setSource(r.source);
            } finally {
              setDrafting(false);
            }
          }}
        >
          {drafting ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : <Sparkles size={18} aria-hidden="true" />}
          {drafting ? t('share.drafting') : t('share.aiDraft')}
        </button>
      )}
      <button
        type="button"
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 cta text-on-primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text ?? '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard blocked: the rep can still select the text by hand.
          }
        }}
      >
        <Copy size={18} aria-hidden="true" />
        {copied ? t('share.copied') : t('share.copy')}
      </button>
      <p role="status" className="sr-only">
        {copied ? t('share.copied') : ''}
      </p>
    </section>
  );
}
