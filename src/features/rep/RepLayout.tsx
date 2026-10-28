import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { CalendarCheck, Home, RefreshCw, Settings2, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Wordmark from '../../components/Wordmark';
import SyncChip from '../../components/SyncChip';
import Footer from '../../components/Footer';
import SkipLink from '../../components/SkipLink';
import { LanguageSelect, ThemeSelect } from '../../components/Settings';

const NAV = [
  { to: '/rep', end: true, icon: CalendarCheck, key: 'nav.today' },
  { to: '/rep/godown', end: false, icon: Warehouse, key: 'nav.godown' },
  { to: '/rep/sync', end: false, icon: RefreshCw, key: 'nav.sync' },
];

/** Mobile shell: compact header, settings drawer, thumb-reach bottom nav. */
export default function RepLayout() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-20">
      <SkipLink />
      <header className="sticky top-0 z-10 bg-header text-on-header">
        <div className="flex items-center gap-2 px-4 py-2">
          <Link to="/" aria-label={`${t('app.name')} · ${t('nav.home')}`} className="tap flex items-center">
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <SyncChip />
            <button
              type="button"
              className="tap inline-flex items-center justify-center rounded-md"
              aria-expanded={settingsOpen}
              aria-controls="rep-settings"
              aria-label={t('a11y.settings')}
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <Settings2 size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
        {settingsOpen && (
          <div id="rep-settings" className="grid gap-2 border-t border-white/20 px-4 py-3">
            <LanguageSelect />
            <ThemeSelect />
          </div>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />

      <nav
        aria-label={t('a11y.mainNav')}
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-bg"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ to, end, icon: Icon, key }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `tap flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                    isActive ? 'font-bold text-ink' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} aria-hidden="true" className={isActive ? 'text-accent' : ''} />
                    {t(key)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <Link to="/" className="tap flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted">
              <Home size={22} aria-hidden="true" />
              {t('nav.home')}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
