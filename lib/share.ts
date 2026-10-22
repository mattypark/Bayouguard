'use client';

/* Share a risk reading as a 1200×630 image card: rendered off-screen,
 * captured with html2canvas (loaded only when someone taps Share), then
 * handed to the native share sheet with the PNG where the browser can share
 * files, or downloaded as bayouguard-risk.png where it can't. A link-only
 * share is the last resort. */

import type { HomeSnapshot, Tier } from './types';
import type { Lang, MsgKey, Params } from './i18n';
import { TIER_HEX } from './theme';

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';
type T = (key: MsgKey, params?: Params) => string;

const W = 1200;
const H = 630;
const TINT: Record<Tier, string> = { LOW: '#E8F5E9', MEDIUM: '#FFF3E0', HIGH: '#FFEBEE', CRITICAL: '#F3E5F5' };
const INK: Record<Tier, string> = { LOW: '#1B5E20', MEDIUM: '#B33F00', HIGH: '#B71C1C', CRITICAL: '#4A148C' };
const DRIVE_TIER: Record<HomeSnapshot['drive']['state'], Tier> = { YES: 'LOW', CAUTION: 'MEDIUM', NO: 'HIGH' };

export function shareUrl(snapshot: HomeSnapshot, center: { lat: number; lng: number } | null): string {
  const params = new URLSearchParams({ address: snapshot.risk.address });
  if (center) {
    params.set('lat', center.lat.toFixed(5));
    params.set('lng', center.lng.toFixed(5));
  }
  return `${window.location.origin}/map?${params.toString()}`;
}

function el(tag: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text != null) node.textContent = text;
  return node;
}

/* The card, always in the light palette so it reads the same everywhere it
 * lands. Built imperatively: it only exists for the moment of capture. */
function buildCard(snapshot: HomeSnapshot, t: T, lang: Lang): HTMLElement {
  const { risk, drive } = snapshot;
  const tier = risk.tier;
  const sans = getComputedStyle(document.body).fontFamily;
  const display = 'var(--font-display), Georgia, serif';
  const card = el('div', {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${W}px`,
    height: `${H}px`,
    background: '#F0F5FF',
    color: '#1A1A2E',
    fontFamily: sans,
    padding: '64px 72px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  });
  card.setAttribute('aria-hidden', 'true');

  card.append(el('div', { fontFamily: display, fontSize: '44px', color: '#1A4480' }, 'BayouGuard'));
  card.append(
    el('div', { marginTop: '36px', fontSize: '40px', fontWeight: '600', lineHeight: '1.2', maxWidth: '1000px' }, risk.address),
  );

  const row = el('div', { marginTop: '40px', display: 'flex', alignItems: 'center', gap: '40px' });
  const score = el('div', { display: 'flex', alignItems: 'baseline', gap: '14px' });
  score.append(el('span', { fontSize: '120px', fontWeight: '700', lineHeight: '1', color: INK[tier] }, String(risk.score)));
  score.append(el('span', { fontSize: '30px', color: '#4A6FA5' }, '/ 100'));
  row.append(score);
  const badge = el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 26px',
    borderRadius: '999px',
    background: TINT[tier],
    color: INK[tier],
    fontSize: '32px',
    fontWeight: '700',
  });
  badge.append(el('span', { width: '20px', height: '20px', borderRadius: '50%', background: TIER_HEX.light[tier], display: 'inline-block' }));
  badge.append(document.createTextNode(t(`tier.${tier}`)));
  row.append(badge);
  card.append(row);

  const dt = DRIVE_TIER[drive.state];
  card.append(
    el(
      'div',
      {
        marginTop: '36px',
        padding: '18px 26px',
        borderLeft: `8px solid ${INK[dt]}`,
        background: TINT[dt],
        fontSize: '34px',
        fontWeight: '700',
        color: INK[dt],
        alignSelf: 'flex-start',
      },
      t(`drive.${drive.state}`),
    ),
  );

  const footer = el('div', {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '24px',
    color: '#4A6FA5',
  });
  const when = new Date(risk.updatedAt).toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-US' : 'vi-VN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  footer.append(el('span', {}, `${when} · ${t(`riskSource.${risk.source}`)}`));
  footer.append(el('span', { fontWeight: '600', color: '#1A4480' }, 'bayouguard.vercel.app'));
  card.append(footer);
  return card;
}

async function renderPng(snapshot: HomeSnapshot, t: T, lang: Lang): Promise<Blob | null> {
  const { default: html2canvas } = await import('html2canvas');
  const card = buildCard(snapshot, t, lang);
  document.body.append(card);
  try {
    const canvas = await html2canvas(card, { width: W, height: H, scale: 1, backgroundColor: '#F0F5FF', logging: false });
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } finally {
    card.remove();
  }
}

export async function shareRisk(
  snapshot: HomeSnapshot,
  center: { lat: number; lng: number } | null,
  t: T,
  lang: Lang,
): Promise<ShareResult> {
  const url = shareUrl(snapshot, center);
  const text = t('share.text', {
    address: snapshot.risk.address,
    tier: t(`tier.${snapshot.risk.tier}`),
    score: snapshot.risk.score,
    drive: t(`drive.${snapshot.drive.state}`),
  });

  let png: Blob | null = null;
  try {
    png = await renderPng(snapshot, t, lang);
  } catch {
    png = null;
  }

  if (png) {
    const file = new File([png], 'bayouguard-risk.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'BayouGuard', text: `${text} ${url}` });
        return 'shared';
      } catch (err) {
        if ((err as Error).name === 'AbortError') return 'cancelled';
      }
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(png);
      a.download = 'bayouguard-risk.png';
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      return 'downloaded';
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: 'BayouGuard', text, url });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
