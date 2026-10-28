import { Link } from 'react-router-dom';
import { ChevronRight, LayoutDashboard, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from '../i18n';
import Wordmark from '../components/Wordmark';
import Footer from '../components/Footer';
import SkipLink from '../components/SkipLink';

/** First screen: language first (big targets, native script), then role. */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="bg-header px-4 pb-10 pt-8 text-on-header">
        <div className="mx-auto max-w-md">
          <Wordmark size="lg" />
          <h1 className="mt-8 text-3xl leading-tight sm:text-4xl">{t('app.tagline')}</h1>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-8">
        <section aria-labelledby="lang-h">
          <h2 id="lang-h" className="text-2xl">
            {t('welcome.chooseLanguage')}
          </h2>
          <div role="radiogroup" aria-labelledby="lang-h" className="mt-4 grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => {
              const active = i18n.language === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  lang={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`tap rounded-md hairline px-4 py-3 text-left text-lg ${
                    active
                      ? 'border-accent bg-accent-soft font-bold text-ink outline outline-2 outline-accent'
                      : 'border-line-strong bg-raised'
                  }`}
                >
                  {l.native}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="role-h" className="mt-10">
          <h2 id="role-h" className="text-2xl">
            {t('welcome.chooseRole')}
          </h2>
          <ul className="mt-4 space-y-3">
            <RoleLink to="/rep" icon={Smartphone} title={t('welcome.rep')} desc={t('welcome.repDesc')} primary />
            <RoleLink
              to="/manager"
              icon={LayoutDashboard}
              title={t('welcome.manager')}
              desc={t('welcome.managerDesc')}
            />
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function RoleLink(props: {
  to: string;
  icon: typeof Smartphone;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  const { to, icon: Icon, title, desc, primary } = props;
  return (
    <li>
      <Link
        to={to}
        className={`tap flex items-center gap-4 rounded-lg hairline p-4 ${
          primary ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-raised'
        }`}
      >
        <Icon size={28} aria-hidden="true" className="shrink-0" />
        <span className="flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          <span className="block text-sm opacity-85">{desc}</span>
        </span>
        <ChevronRight size={22} aria-hidden="true" />
      </Link>
    </li>
  );
}
