import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Flag, Gauge, Leaf, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Wordmark from '../../components/Wordmark';
import Footer from '../../components/Footer';
import SkipLink from '../../components/SkipLink';
import SyncChip from '../../components/SyncChip';
import { LanguageSelect, ThemeSelect } from '../../components/Settings';
import { DEMO_TODAY } from '../../config/demo';
import { formatDate } from '../../i18n/format';

const TABS = [
  { to: '/manager', end: true, icon: Gauge, key: 'mgr.tabs.overview' },
  { to: '/manager/flags', end: false, icon: Flag, key: 'mgr.tabs.flags' },
  { to: '/manager/territory', end: false, icon: Map, key: 'mgr.tabs.territory' },
  { to: '/manager/impact', end: false, icon: Leaf, key: 'mgr.tabs.impact' },
];

/** Web desk shell for the area manager. */
export default function ManagerLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="bg-header text-on-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" aria-label={`${t('app.name')} · ${t('nav.home')}`} className="tap flex items-center">
            <Wordmark />
          </Link>
          <SyncChip />
          <p className="text-sm text-header-muted">{t('mgr.demoDate', { date: formatDate(DEMO_TODAY) })}</p>
          <div className="grid w-full gap-2 sm:ml-auto sm:w-auto sm:grid-cols-2">
            <LanguageSelect />
            <ThemeSelect />
          </div>
        </div>
        <nav aria-label={t('mgr.tabs.nav')} className="mx-auto max-w-6xl px-2">
          <ul className="grid grid-cols-4 sm:flex sm:gap-2">
            {TABS.map(({ to, end, icon: Icon, key }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `tap flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                      isActive ? 'border-b-2 border-accent font-bold text-on-header' : 'text-header-muted'
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<p className="text-muted">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
        <p className="mt-8 text-xs text-muted">{t('mgr.pilotNote')}</p>
      </main>
      <Footer />
    </div>
  );
}
