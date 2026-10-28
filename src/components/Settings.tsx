import { useId, useState } from 'react';
import { Languages, SunMoon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LangCode } from '../i18n';
import { THEMES, applyTheme, loadTheme, type Theme } from '../design/theme';

const selectCls =
  'tap w-full rounded-md hairline border-white/40 bg-raised px-3 text-base text-ink';

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
        <Languages size={18} aria-hidden="true" />
        {t('settings.language')}
      </label>
      <select
        id={id}
        className={selectCls}
        value={i18n.language}
        onChange={(e) => setLanguage(e.target.value as LangCode)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ThemeSelect() {
  const { t } = useTranslation();
  const id = useId();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
        <SunMoon size={18} aria-hidden="true" />
        {t('settings.theme')}
      </label>
      <select
        id={id}
        className={selectCls}
        value={theme}
        onChange={(e) => {
          const next = e.target.value as Theme;
          setTheme(next);
          applyTheme(next);
        }}
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
