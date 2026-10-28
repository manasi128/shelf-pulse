export const THEMES = ['system', 'light', 'dark', 'outdoor'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'shelfpulse.theme';

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (THEMES as readonly string[]).includes(v)) return v as Theme;
  } catch {
    // Storage unavailable: use the phone's setting.
  }
  return 'system';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Non-critical.
  }
}
