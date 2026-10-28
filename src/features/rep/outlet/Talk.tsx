import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../data/db';
import { setAnswers, toggleSignal } from '../../../data/repo';
import type { SignalId } from '../../../logic';
import { useOutletVisit } from './useOutletVisit';
import VoiceNote from './VoiceNote';

function Chip(props: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.on}
      onClick={props.onClick}
      className={`tap inline-flex items-center gap-1 rounded-pill hairline px-3 py-1 text-sm ${
        props.on ? 'border-accent bg-accent-soft font-semibold' : 'border-line bg-raised'
      }`}
    >
      {props.on && <Check size={14} aria-hidden="true" />}
      {props.label}
    </button>
  );
}

/** Three questions for the retailer. Answers become range gaps and signals. */
export default function Talk() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  if (!v) return null;
  const { data, outlet, lines, draft, today } = v;

  const onList = new Set(lines.map((l) => l.sku.id));
  const offList = data.skus.filter((s) => !onList.has(s.id));
  const asks = draft?.answers.rangeAsks ?? outlet.rangeAsks;
  const hasSignal = (skuId: string, s: SignalId) => (draft?.signals[skuId] ?? []).includes(s);

  const signalQuestion = (id: string, q: string, signal: SignalId) => (
    <fieldset className="card p-3">
      <legend id={id} className="font-semibold">
        {q}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {lines.map((l) => (
          <Chip
            key={l.sku.id}
            on={hasSignal(l.sku.id, signal)}
            label={`${l.sku.brand} · ${l.sku.name}`}
            onClick={() => void toggleSignal(db, { outletId: outlet.id, skuId: l.sku.id, signal, today })}
          />
        ))}
      </div>
    </fieldset>
  );

  return (
    <section className="px-4 py-5">
      <h1 className="text-3xl">{t('talk.title')}</h1>
      <div className="mt-4 space-y-3">
        <VoiceNote v={v} />
        <fieldset className="card p-3">
          <legend className="font-semibold">{t('talk.q1')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {offList.map((s) => {
              const on = asks.includes(s.id);
              return (
                <Chip
                  key={s.id}
                  on={on}
                  label={`${s.brand} · ${s.name}`}
                  onClick={() =>
                    void setAnswers(db, {
                      outletId: outlet.id,
                      today,
                      answers: { rangeAsks: on ? asks.filter((x) => x !== s.id) : [...asks, s.id] },
                    })
                  }
                />
              );
            })}
          </div>
        </fieldset>
        {signalQuestion('q2', t('talk.q2'), 'discount_ask')}
        {signalQuestion('q3', t('talk.q3'), 'backroom_cartons')}
      </div>
      <Link to="../actions" relative="path" className="tap mt-5 flex w-full items-center justify-center rounded-md hairline border-line-strong px-4 cta">
        {t('talk.next')}
      </Link>
    </section>
  );
}
