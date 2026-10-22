'use client';

/* "Report flooding here": a severity, an optional note, and where. POSTs
 * to /api/reports; in demo mode the pin stays on this device and the form
 * says it wasn't shared. */

import { useState } from 'react';
import type { CommunityReport, ReportSeverity } from '@/lib/contract';
import { useI18n } from '@/lib/i18n';

const SEVERITIES: ReportSeverity[] = ['water_on_road', 'passable', 'impassable'];

export default function ReportForm({
  where,
  whereLabel,
  onDone,
  onCancel,
}: {
  where: { lat: number; lng: number };
  whereLabel: string;
  onDone: (report: CommunityReport, shared: boolean) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [severity, setSeverity] = useState<ReportSeverity | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!severity || sending) return;
    setSending(true);
    setError(false);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...where, severity, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { ok: boolean; report: CommunityReport };
      onDone({ ...body.report, id: `local-${Date.now()}` }, body.ok);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <h2 className="text-[1rem] font-semibold text-ob-text">{t('report.title')}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-ob-muted">{whereLabel}</p>
      </div>
      <fieldset>
        <legend className="text-[0.75rem] font-medium text-ob-muted">{t('report.severity')}</legend>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {SEVERITIES.map((s) => (
            <label
              key={s}
              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 text-[0.875rem] transition-colors ${
                severity === s ? 'border-ob-accent bg-ob-accent/10 text-ob-text' : 'border-ob-border text-ob-text hover:bg-ob-bg'
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={s}
                checked={severity === s}
                onChange={() => setSeverity(s)}
                className="h-4 w-4 accent-[rgb(var(--ob-accent-rgb))]"
              />
              {t(`report.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-[0.75rem] font-medium text-ob-muted">{t('report.note')}</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 140))}
          maxLength={140}
          className="h-11 rounded-lg border border-ob-border bg-ob-surface px-3 text-[1rem] text-ob-text outline-none focus:border-ob-water"
        />
      </label>
      {error && (
        <p role="alert" className="text-[0.8125rem]" style={{ color: 'var(--tier-high-ink)' }}>
          {t('report.error')}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-lg border border-ob-border bg-ob-surface text-[0.875rem] font-semibold text-ob-accent hover:bg-ob-bg"
        >
          {t('action.cancel')}
        </button>
        <button
          type="submit"
          disabled={!severity || sending}
          className="h-11 flex-1 rounded-lg bg-ob-accent text-[0.875rem] font-semibold text-ob-onaccent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? t('report.sending') : t('report.submit')}
        </button>
      </div>
    </form>
  );
}
