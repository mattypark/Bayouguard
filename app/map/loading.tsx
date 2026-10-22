'use client';

/* Shown while /map's data loads. */

import { useI18n } from '@/lib/i18n';

export default function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 bg-ob-bg2" role="status" aria-label={t('map.loading')}>
      <p className="fade-in-late absolute inset-x-0 bottom-24 text-center text-[0.875rem] text-ob-muted">{t('map.readingGauges')}</p>
    </div>
  );
}
