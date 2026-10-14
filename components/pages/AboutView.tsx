'use client';

/* What BayouGuard is, how it works, how accurate it is (and what we fixed
 * to get an honest number), where the data comes from, and who built it. */

import { useEffect, useState } from 'react';
import PageShell from '../PageShell';
import { useI18n, type MsgKey } from '@/lib/i18n';
import { MODEL_CARD } from '@/lib/modelCard';

const SOURCES: Array<{ name: MsgKey; href: string; use: MsgKey }> = [
  { name: 'about.src.hcfws', href: 'https://www.harriscountyfws.org', use: 'about.src.hcfws.use' },
  { name: 'about.src.meteo', href: 'https://open-meteo.com', use: 'about.src.meteo.use' },
  { name: 'about.src.fema', href: 'https://www.fema.gov/about/openfema', use: 'about.src.fema.use' },
  { name: 'about.src.census', href: 'https://geocoding.geo.census.gov', use: 'about.src.census.use' },
  { name: 'about.src.osm', href: 'https://photon.komoot.io', use: 'about.src.osm.use' },
  { name: 'about.src.esri', href: 'https://www.esri.com', use: 'about.src.esri.use' },
];

const TEAM: Array<{ name: string; role: MsgKey }> = [
  { name: 'Frank', role: 'about.role.frank' },
  { name: 'Genesis', role: 'about.role.genesis' },
  { name: 'Matthew', role: 'about.role.matthew' },
  { name: 'Carlos', role: 'about.role.carlos' },
];

const SCHOOL = 'Kerr High School';

// Harvey made landfall Aug 25, 2017; the banner runs that week each year.
function isHarveyWeek(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return Number(parts.month) === 8 && Number(parts.day) >= 25 && Number(parts.day) <= 31;
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-ob-border bg-ob-surface p-4">
      <p className="font-mono text-[1.75rem] font-semibold leading-none text-ob-accent tabular">{value}</p>
      <p className="mt-2 text-[0.875rem] font-semibold text-ob-text">{label}</p>
      <p className="mt-0.5 text-[0.8125rem] leading-snug text-ob-muted">{detail}</p>
    </div>
  );
}

export default function AboutView() {
  const { t, num, locale } = useI18n();
  const [harvey, setHarvey] = useState(false);
  useEffect(() => setHarvey(isHarveyWeek(new Date())), []);
  const pct = (n: number, d = 1) => `${num(n, d)}%`;
  const year = new Date().getFullYear();

  return (
    <PageShell>
      {harvey && (
        <p role="note" className="mt-2 rounded-lg bg-ob-accent px-4 py-3 text-[0.9375rem] font-medium text-ob-onaccent">
          {t('about.harvey', { years: year - 2017 })}
        </p>
      )}

      <h1 className="mt-4 font-display text-[2.125rem] leading-tight text-ob-text">{t('about.title')}</h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-ob-text">{t('about.p1')}</p>
      <p className="mt-3 text-[1rem] leading-relaxed text-ob-text">{t('about.p2')}</p>

      <h2 className="mt-10 text-[1.25rem] font-semibold text-ob-text">{t('about.how')}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {(['data', 'model', 'answer'] as const).map((k, i) => (
          <li key={k} className="rounded-xl border border-ob-border bg-ob-surface p-4">
            <p className="text-[0.8125rem] font-medium text-ob-muted">{t('about.step', { n: i + 1 })}</p>
            <p className="mt-1 text-[1rem] font-semibold text-ob-text">{t(`about.how.${k}`)}</p>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ob-muted">
              {t(`about.how.${k}.body`, { readings: MODEL_CARD.trainingReadings.toLocaleString(locale) })}
            </p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-[1.25rem] font-semibold text-ob-text">{t('about.accuracy')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={pct(MODEL_CARD.accuracy, 2)} label={t('about.stat.accuracy')} detail={t('about.stat.accuracy.detail')} />
        <Stat value={pct(MODEL_CARD.rocAuc, 2)} label={t('about.stat.auc')} detail={t('about.stat.auc.detail')} />
        <Stat value={pct(MODEL_CARD.recallHighCritical)} label={t('about.stat.recallHigh')} detail={t('about.stat.recallHigh.detail', { pct: pct(MODEL_CARD.recallHighCritical) })} />
        <Stat value={pct(MODEL_CARD.recallNormal)} label={t('about.stat.recallNormal')} detail={t('about.stat.recallNormal.detail')} />
      </div>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ob-text">{t('about.aucExplain')}</p>
      <section className="mt-4 rounded-xl border border-ob-border bg-ob-surface2 p-4">
        <h3 className="text-[0.9375rem] font-semibold text-ob-text">{t('about.fixed')}</h3>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ob-text">
          {t('about.fixed.body', { leaked: pct(MODEL_CARD.leakedAccuracy, 0), real: pct(MODEL_CARD.accuracy, 2) })}
        </p>
      </section>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-ob-muted">{t('about.outlookNote')}</p>

      <h2 className="mt-10 text-[1.25rem] font-semibold text-ob-text">{t('about.sources')}</h2>
      <ul className="mt-3 flex flex-col divide-y divide-ob-border rounded-xl border border-ob-border bg-ob-surface">
        {SOURCES.map((s) => (
          <li key={s.href} className="p-3">
            <a href={s.href} target="_blank" rel="noreferrer" className="text-[0.9375rem] font-semibold text-ob-accent underline-offset-2 hover:underline">
              {t(s.name)}
            </a>
            <p className="mt-0.5 text-[0.875rem] text-ob-muted">{t(s.use)}</p>
          </li>
        ))}
      </ul>

      <aside className="mt-8 rounded-lg border-l-4 px-4 py-3" style={{ borderColor: 'var(--tier-med-ink)', background: 'var(--tier-med-tint)' }}>
        <p className="text-[0.9375rem] font-semibold text-ob-text">{t('about.limits')}</p>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ob-text">{t('about.limits.body')}</p>
      </aside>

      <h2 className="mt-10 text-[1.25rem] font-semibold text-ob-text">{t('about.team')}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {TEAM.map((m) => (
          <li key={m.name} className="rounded-xl border border-ob-border bg-ob-surface p-4">
            <p className="text-[1rem] font-semibold text-ob-text">{m.name}</p>
            <p className="mt-0.5 text-[0.875rem] text-ob-muted">{t(m.role)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[0.9375rem] text-ob-text">{t('about.school', { school: SCHOOL })}</p>
      <p className="mt-1 text-[0.875rem] text-ob-muted">{t('about.cac')}</p>
    </PageShell>
  );
}
