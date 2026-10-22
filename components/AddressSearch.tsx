'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { fetchSuggestions } from '@/lib/client';
import type { Suggestion } from '@/lib/geocode';
import { useI18n } from '@/lib/i18n';
import { onSavedChange, readSaved, writeSaved } from '@/lib/savedAddress';

const DEBOUNCE_MS = 220;

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-ob-muted">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function AddressSearch({
  onSearch,
  initialValue,
  syncValue,
  busy = false,
  waking = false,
  variant = 'pill',
  large = false,
  label,
  onValue,
  id,
}: {
  /** 'field' is a plain form input: no submit button, no save star. */
  variant?: 'pill' | 'field';
  /** Bigger field for the home page. */
  large?: boolean;
  /** Visible label for the field variant. */
  label?: string;
  /** Every change to the text, and every picked suggestion. */
  onValue?: (value: string, coords?: { lat: number; lng: number }) => void;
  id?: string;
  /** An address handed over from the landing page; searched once on mount. */
  initialValue?: string;
  /** The address the app resolved last; the box follows it. */
  syncValue?: string;
  busy?: boolean;
  waking?: boolean;
  onSearch?: (
    addr: string,
    submitted: boolean,
    coords?: { lat: number; lng: number },
  ) => void;
}) {
  const { t } = useI18n();
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false); // suppress fetch right after a pick
  // Suggestions are only for someone typing — never for a value we restored
  // or were handed (React's dev double-run of effects defeats a skip flag).
  const typed = useRef(false);
  const onSearchRef = useRef(onSearch); // keep the mount effect off a stale closure
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // An address handed in (the URL) wins over the saved one, and has already
  // been searched server-side — so it only fills the box.
  // Otherwise restore the saved address: refresh status only, don't open the map.
  // Reads onSearch from a ref so the empty dep array is genuinely safe.
  const initialRef = useRef(initialValue);
  const isPill = useRef(variant === 'pill');
  useEffect(() => {
    if (initialRef.current) {
      skipNextFetch.current = true;
      setValue(initialRef.current);
      return;
    }
    const v = isPill.current ? readSaved() : null;
    if (v) {
      skipNextFetch.current = true;
      setValue(v.label);
      setSaved(v.label);
      onSearchRef.current?.(v.label, false, v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : undefined);
    }
  }, []);

  // The saved address can change elsewhere (the address card's Save button).
  useEffect(() => onSavedChange(() => setSaved(readSaved()?.label ?? null)), []);

  // Follow the resolved address (a chip, Locate me, a corrected spelling).
  useEffect(() => {
    if (!syncValue) return;
    skipNextFetch.current = true;
    typed.current = false;
    setValue(syncValue);
    setOpen(false);
  }, [syncValue]);

  // Debounced type-ahead. Aborts the in-flight request on each keystroke.
  useEffect(() => {
    if (skipNextFetch.current || !typed.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(async () => {
      const found = await fetchSuggestions(q, controller.signal);
      // The geocoder can return the same place more than once.
      const results = found.filter((r, i) => found.findIndex((o) => o.label === r.label) === i);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActive(-1);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const save = () => {
    if (!value) return;
    if (saved === value) writeSaved(null);
    else writeSaved({ label: value });
    setSaved(saved === value ? null : value);
  };

  const pick = (s: Suggestion) => {
    skipNextFetch.current = true;
    setValue(s.label);
    setOpen(false);
    setSuggestions([]);
    onValue?.(s.label, { lat: s.lat, lng: s.lng });
    onSearch?.(s.label, true, { lat: s.lat, lng: s.lng });
  };

  const input = (cls: string) => (
    <input
      ref={inputRef}
      id={inputId}
      enterKeyHint="search"
      value={value}
      onChange={(e) => {
        typed.current = true;
        setValue(e.target.value);
        onValue?.(e.target.value);
      }}
      onKeyDown={onKeyDown}
      onFocus={() => suggestions.length > 0 && setOpen(true)}
      placeholder={t('search.placeholder')}
      aria-label={variant === 'pill' || !label ? t('search.label') : undefined}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listId}
      aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      autoComplete="off"
      className={`min-w-0 text-[1rem] text-ob-text outline-none placeholder:text-ob-muted ${cls}`}
    />
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const clear = () => {
    skipNextFetch.current = true;
    setValue('');
    setSuggestions([]);
    setOpen(false);
    onValue?.('');
    inputRef.current?.focus();
  };
  const clearButton = value ? (
    <button
      type="button"
      onClick={clear}
      aria-label={t('search.clear')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1.25rem] leading-none text-ob-muted transition hover:bg-ob-bg hover:text-ob-text"
    >
      ×
    </button>
  ) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) {
      pick(suggestions[active]);
      return;
    }
    if (value) {
      setOpen(false);
      onSearch?.(value, true);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // In a form field, Enter picks the highlighted suggestion instead of submitting.
    if (variant === 'field' && e.key === 'Enter' && open && active >= 0 && suggestions[active]) {
      e.preventDefault();
      pick(suggestions[active]);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={`relative w-full ${variant === 'pill' ? 'mx-auto max-w-2xl' : ''}`}>
      {variant === 'field' ? (
        <div className="flex flex-col gap-1">
          {label && (
            <label htmlFor={inputId} className={`font-medium text-ob-text ${large ? 'text-[1.0625rem]' : 'text-[0.8125rem]'}`}>
              {label}
            </label>
          )}
          <div className="relative">
            {input(
              large
                ? 'h-14 w-full rounded-xl border-2 border-ob-border bg-ob-surface pl-4 pr-12 !text-[1.125rem] focus:border-ob-water'
                : 'h-11 w-full rounded-lg border border-ob-border bg-ob-surface pl-3 pr-11 focus:border-ob-water',
            )}
            {clearButton && <div className={`absolute right-1 top-1/2 -translate-y-1/2 ${large ? 'right-2' : ''}`}>{clearButton}</div>}
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="ob-panel ob-float flex h-11 w-full items-center gap-1.5 rounded-full p-1 pl-4 focus-within:border-ob-water"
        >
          <SearchIcon />
          {input('flex-1 bg-transparent py-2')}
          {clearButton}
          <button
            type="button"
            onClick={save}
            title={saved === value && value ? t('search.saved') : t('search.save')}
            aria-label={t('search.save')}
            aria-pressed={Boolean(saved && saved === value)}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-ob-muted transition hover:bg-ob-bg hover:text-ob-accent sm:flex"
          >
            {saved === value && value ? '★' : '☆'}
          </button>
          <button
            type="submit"
            aria-busy={busy}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ob-accent px-4 text-[0.8125rem] font-semibold text-ob-onaccent transition hover:brightness-110 active:scale-[0.97]"
          >
            {busy && <span aria-hidden className="spin h-3 w-3 rounded-full border-2 border-white border-t-transparent" />}
            {busy && waking ? t('status.waking') : t('search.submit')}
          </button>
        </form>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('search.suggestions')}
          className="ob-panel ob-float absolute z-50 mt-2 w-full overflow-hidden rounded-xl py-1 text-left"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lng}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
            >
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                className={`flex min-h-[48px] w-full items-center gap-3 px-4 py-2.5 text-left transition ${large ? 'text-[1.0625rem]' : 'text-sm'} ${
                  i === active ? 'bg-ob-accent/10 text-ob-accent' : 'text-ob-muted hover:bg-ob-bg'
                }`}
              >
                <span className="text-ob-muted" aria-hidden>
                  ⌖
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
