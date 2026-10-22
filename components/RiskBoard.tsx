'use client';

/* Right column: the gauges closest to flooding, ranked by how much room is
 * left. Each row's bar is the water level as a share of flood stage, so the
 * ranking and the reason for it read in one glance. Tap a row to fly there. */

import type { GaugePoint } from '@/lib/types';
import { TIER_COLOR, TIER_INK } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

const ROWS = 7;

export default function RiskBoard({
  gauges,
  onPick,
}: {
  gauges: GaugePoint[];
  onPick: (g: GaugePoint) => void;
}) {
  const { t, num } = useI18n();
  const ranked = [...gauges].sort((a, b) => a.buffer - b.buffer).slice(0, ROWS);

  return (
    <section className="ob-panel ob-float w-[320px] rounded-xl p-4" aria-labelledby="risk-board-title">
      <div className="flex items-baseline justify-between">
        <h2 id="risk-board-title" className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          {t('board.title')}
        </h2>
        <span className="text-[0.75rem] text-ob-muted">{t('board.unit')}</span>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-3 text-[0.8125rem] text-ob-muted">{t('board.empty')}</p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {ranked.map((g, i) => {
            const pct = g.flood > 0 ? Math.max(0, Math.min(1, g.current / g.flood)) : 0;
            const over = g.buffer <= 0;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onPick(g)}
                  className="group -mx-2 flex min-h-[48px] w-[calc(100%+16px)] flex-col gap-1.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ob-bg"
                  aria-label={t('board.rowLabel', { name: g.name, tier: t(`tier.${g.tier}`), ft: num(g.buffer, 1) })}
                >
                  <span className="flex items-center gap-2 text-[0.8125rem]">
                    <span className="w-4 font-mono text-[0.75rem] text-ob-muted tabular">{i + 1}</span>
                    <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: TIER_COLOR[g.tier] }} />
                    <span className="truncate font-medium" title={g.name}>{g.name}</span>
                    <span
                      className="ml-auto font-mono text-[0.75rem] font-semibold tabular"
                      style={{ color: over || g.tier !== 'LOW' ? TIER_INK[g.tier] : undefined }}
                    >
                      {over ? t('board.over', { ft: num(Math.abs(g.buffer), 1) }) : num(g.buffer, 1)}
                    </span>
                  </span>
                  <span className="ml-6 block h-1.5 overflow-hidden rounded-full bg-ob-bg2">
                    <span
                      className="block h-full origin-left rounded-full"
                      style={{ backgroundColor: TIER_COLOR[g.tier], transform: `scaleX(${pct})` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
