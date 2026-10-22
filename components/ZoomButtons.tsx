'use client';

/* Big + and − buttons. Pinch and scroll-wheel zoom aren't obvious to
 * everyone, and they're hard with unsteady hands. */

import type { RefObject } from 'react';
import type L from 'leaflet';
import { useI18n } from '@/lib/i18n';

export default function ZoomButtons({
  map,
  vertical = false,
  className = '',
}: {
  map: RefObject<L.Map | null>;
  vertical?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const btn =
    'flex h-11 w-11 items-center justify-center text-[1.5rem] leading-none text-ob-accent transition-colors hover:bg-ob-bg';
  return (
    <div
      role="group"
      aria-label={t('map.zoom')}
      className={`ob-panel ob-float flex overflow-hidden rounded-full ${vertical ? 'flex-col' : ''} ${className}`}
    >
      <button type="button" aria-label={t('map.zoomIn')} onClick={() => map.current?.zoomIn()} className={btn}>
        +
      </button>
      <span aria-hidden className={vertical ? 'h-px bg-ob-border' : 'w-px bg-ob-border'} />
      <button type="button" aria-label={t('map.zoomOut')} onClick={() => map.current?.zoomOut()} className={btn}>
        −
      </button>
    </div>
  );
}
