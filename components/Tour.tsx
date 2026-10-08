'use client';

/* First-visit coach marks, from the YCGlobe reference: the page dims, the
 * thing being described is cut out of the dim, and a small card sits beside
 * it with Skip · progress dots · Next. Steps whose target isn't on screen
 * (the rail and board are desktop-only) are dropped, not shown floating. */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import BrandMark from './landing/BrandMark';

const STORAGE_KEY = 'bayouguard_tour_v1';
const GAP = 12;
const CARD_W = 300;
const PAD = 6;

interface Step {
  /** data-tour value of the element to spotlight; null centres the card. */
  target: string | null;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: 'search',
    title: 'Start with your address',
    body: 'Type any Texas address. BayouGuard finds the gauges nearest to you and says what the water is doing there.',
  },
  {
    target: 'filters',
    title: 'Every gauge, by risk',
    body: 'Each row is a filter and a count. Turn a tier off to hide those gauges on the map.',
  },
  {
    target: 'board',
    title: 'Closest to flooding',
    body: 'Ranked by feet left before flood stage. Tap one to fly to it.',
  },
  {
    target: null,
    title: 'Tap any dot',
    body: 'Every dot is a gauge. Tap one for its level, its trend, and the last 48 hours.',
  },
];

function visibleRect(target: string | null): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? r : null;
}

export default function Tour() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Decide once, after layout, whether to run and which steps can be anchored.
  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(STORAGE_KEY) === 'done';
    } catch {
      // Storage blocked (private mode): show the tour; it just won't remember.
    }
    if (done) return;
    const id = window.setTimeout(() => {
      setSteps(STEPS.filter((s) => s.target === null || visibleRect(s.target)));
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  const step = steps?.[i] ?? null;

  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => setRect(visibleRect(step.target));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'done');
    } catch {
      // Nothing to do — see above.
    }
    setSteps(null);
  }, []);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finish]);

  if (!steps || !step) return null;

  const last = i === steps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - 24);

  // Beside the target when there's room, otherwise below it; centred when untargeted.
  let left = (vw - width) / 2;
  let top = vh / 2 - 90;
  if (rect) {
    const roomRight = vw - rect.right - GAP - width >= 12;
    if (roomRight && rect.height > 160) {
      left = rect.right + GAP;
      top = Math.min(rect.top, vh - 220);
    } else {
      left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
      top = rect.bottom + GAP;
    }
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(var(--ob-text-rgb) / 0.38)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-ob-text/40 backdrop-blur-[2px]" />
      )}

      <div
        key={i}
        className="ob-float reveal absolute rounded-2xl bg-ob-surface p-4 text-ob-text"
        style={{ left, top, width }}
      >
        <div className="flex items-center gap-1.5 text-ob-accent">
          <BrandMark className="h-4 w-4" />
          <span className="text-[12px] font-semibold">BayouGuard</span>
        </div>
        <h2 id="tour-title" className="mt-2 text-[16px] font-semibold tracking-[-0.01em]">
          {step.title}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ob-muted">{step.body}</p>

        <div className="mt-4 flex items-center">
          <button type="button" onClick={finish} className="text-[13px] font-medium text-ob-muted hover:text-ob-text">
            Skip
          </button>
          <span className="mx-auto flex gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
            {steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-ob-accent' : 'w-1.5 bg-ob-border'}`}
              />
            ))}
          </span>
          <button
            type="button"
            autoFocus
            onClick={() => (last ? finish() : setI(i + 1))}
            className="h-9 rounded-full bg-ob-accent px-4 text-[13px] font-semibold text-white hover:brightness-110"
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
