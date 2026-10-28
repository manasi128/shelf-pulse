import { Link, NavLink, Outlet } from 'react-router-dom';
import { ChevronLeft, ClipboardList, Hash, ListChecks, MessageCircle, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletVisit } from './useOutletVisit';

const TABS = [
  { to: '', end: true, icon: ClipboardList, key: 'tabs.brief' },
  { to: 'count', end: false, icon: Hash, key: 'tabs.count' },
  { to: 'talk', end: false, icon: MessageCircle, key: 'tabs.talk' },
  { to: 'actions', end: false, icon: ListChecks, key: 'tabs.actions' },
  { to: 'order', end: false, icon: ShoppingCart, key: 'tabs.order' },
];

/** One outlet visit: name, back to Today, and every visit step one tap away. */
export default function OutletLayout() {
  const { t } = useTranslation();
  const v = useOutletVisit();
  if (v === undefined) return <p className="p-6 text-muted">{t('common.loading')}</p>;
  if (v === null) return <p className="p-6">404</p>;
  return (
    <div>
      <div className="px-4 pt-3">
        <Link to="/rep" className="tap -ml-2 inline-flex items-center gap-1 px-2 text-sm text-muted">
          <ChevronLeft size={18} aria-hidden="true" />
          {t('brief.backToToday')}
        </Link>
        <p className="font-heading text-2xl font-bold leading-tight">{v.outlet.name}</p>
        <p className="text-sm text-muted">{v.outlet.area}</p>
      </div>
      <nav aria-label={t('tabs.visitSteps')} className="mt-3 border-y">
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, end, icon: Icon, key }) => (
            <li key={key}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `tap flex flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[11px] leading-tight ${
                    isActive ? 'border-b-2 border-accent font-semibold text-ink' : 'text-muted'
                  }`
                }
              >
                <Icon size={20} aria-hidden="true" />
                <span className="break-words">{t(key)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
