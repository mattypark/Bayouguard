'use client';

/* "ZIP 77096 has had 4,186 flood insurance claims since 2015 — Harvey
 * (2017), …" Real NFIP claims (backend, else OpenFEMA). Hidden when there's
 * nothing to say. */

import { useI18n, type MsgKey } from '@/lib/i18n';
import { useEndpoint } from '@/lib/useEndpoint';
import type { FloodHistory } from '@/lib/contract';
import Skeleton from '../Skeleton';

// The English event names the fetcher returns -> dictionary keys.
const EVENT_KEY: Record<string, MsgKey> = {
  'Memorial Day flood (2015)': 'event.memorial2015',
  'Tax Day flood (2016)': 'event.taxday2016',
  'Harvey (2017)': 'event.harvey2017',
  'Imelda (2019)': 'event.imelda2019',
  'Beryl (2024)': 'event.beryl2024',
};

export default function FloodMemory({ zip }: { zip: string }) {
  const { t, locale } = useI18n();
  const { data, loading } = useEndpoint<FloodHistory>(zip ? `/api/flood-history?zip=${zip}` : null);
  if (!zip) return null;
  if (loading) return <Skeleton className="h-12 w-full" />;
  if (!data || data.claimsSince2015 <= 0) return null;

  const events = data.events.map((e) => (EVENT_KEY[e] ? t(EVENT_KEY[e]) : e)).join(', ');
  const count = data.claimsSince2015.toLocaleString(locale);
  return (
    <section className="rounded-lg border border-ob-border bg-ob-surface2 p-3">
      <p className="text-[0.75rem] font-medium text-ob-muted">{t('memory.title')}</p>
      <p className="mt-1 text-[0.875rem] leading-snug text-ob-text">
        {events
          ? t('memory.withEvents', { zip: data.zip, count, events })
          : t('memory.plain', { zip: data.zip, count })}
      </p>
      <p className="mt-1 text-[0.75rem] text-ob-muted">{t('memory.source')}</p>
    </section>
  );
}
