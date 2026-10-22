'use client';

/* Share · Save address · Get alerts for this address. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HomeSnapshot } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { onSavedChange, readSaved, writeSaved } from '@/lib/savedAddress';
import { shareRisk } from '@/lib/share';

export default function ActionRow({
  snapshot,
  center,
  showAlerts = true,
}: {
  snapshot: HomeSnapshot;
  center: { lat: number; lng: number } | null;
  showAlerts?: boolean;
}) {
  const { t, lang } = useI18n();
  const address = snapshot.risk.address;
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSaved(readSaved()?.label === address);
    sync();
    return onSavedChange(sync);
  }, [address]);

  const toggleSave = () => {
    writeSaved(saved ? null : { label: address, lat: center?.lat, lng: center?.lng });
  };

  const share = async () => {
    const result = await shareRisk(snapshot, center, t, lang);
    if (result === 'copied') setNote(t('action.copied'));
    else if (result === 'downloaded') setNote(t('action.downloaded'));
    else if (result === 'failed') setNote(t('action.shareFailed'));
  };

  const btn =
    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ob-border bg-ob-surface px-2 text-[0.8125rem] font-semibold text-ob-accent transition-colors hover:bg-ob-bg';

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" onClick={share} className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6.5h14V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('action.share')}
        </button>
        <button type="button" onClick={toggleSave} aria-pressed={saved} className={btn}>
          <span aria-hidden>{saved ? '★' : '☆'}</span>
          {saved ? t('search.saved') : t('action.save')}
        </button>
      </div>
      {showAlerts && (
      <Link
        href={`/alerts?${new URLSearchParams({ address, ...(center ? { lat: String(center.lat), lng: String(center.lng) } : {}) }).toString()}`}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-ob-accent px-3 text-[0.875rem] font-semibold text-ob-onaccent transition hover:brightness-110"
      >
        {t('action.alerts')}
      </Link>
      )}
      <p role="status" aria-live="polite" className="mt-1 min-h-[16px] text-center text-[0.75rem] text-ob-muted">
        {note}
      </p>
    </div>
  );
}
