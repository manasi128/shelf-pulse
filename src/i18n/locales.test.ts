import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import bn from './locales/bn.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const reference = keys(en).sort();

describe.each([
  ['hi', hi],
  ['mr', mr],
  ['ta', ta],
  ['bn', bn],
])('locale %s', (_code, locale) => {
  it('has exactly the same keys as English', () => {
    expect(keys(locale).sort()).toEqual(reference);
  });
  it('has no empty strings', () => {
    const empty = keys(locale).filter((k) => {
      const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], locale);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
