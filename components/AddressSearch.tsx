'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchSuggestions } from '@/lib/client';
import type { Suggestion } from '@/lib/geocode';

const STORAGE_KEY = 'bayouguard_saved_address';
const DEBOUNCE_MS = 220;

export default function AddressSearch({
  onSearch,
}: {
  onSearch?: (
    addr: string,
    submitted: boolean,
    coords?: { lat: number; lng: number },
  ) => void;
}) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false); // suppress fetch right after a pick/restore
  const onSearchRef = useRef(onSearch); // keep the mount effect off a stale closure
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Restore saved address on mount: refresh status only, don't open the map.
  // Reads onSearch from a ref so the empty dep array is genuinely safe.
  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      skipNextFetch.current = true;
      setValue(v);
      setSaved(v);
      onSearchRef.current?.(v, false);
    }
  }, []);

  // Debounced type-ahead. Aborts the in-flight request on each keystroke.
  useEffect(() => {
    if (skipNextFetch.current) {
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
      const results = await fetchSuggestions(q, controller.signal);
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
    localStorage.setItem(STORAGE_KEY, value);
    setSaved(value);
  };

  const pick = (s: Suggestion) => {
    skipNextFetch.current = true;
    setValue(s.label);
    setOpen(false);
    setSuggestions([]);
    onSearch?.(s.label, true, { lat: s.lat, lng: s.lng });
  };

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
    <div ref={boxRef} className="relative mx-auto w-full max-w-2xl">
      <form
        onSubmit={submit}
        className="ob-panel flex w-full items-center gap-2 rounded-full p-1.5 pl-5 shadow-panel focus-within:border-ob-accent/60 focus-within:shadow-glow"
      >
        <span className="text-ob-faint" aria-hidden>
          ⌖
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Enter a Houston address…"
          aria-label="Search address"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="address-listbox"
          aria-activedescendant={
            open && active >= 0 ? `address-option-${active}` : undefined
          }
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ob-text outline-none placeholder:text-ob-faint"
        />
        <button
          type="button"
          onClick={save}
          title={saved === value && value ? 'Saved' : 'Save address'}
          aria-label="Save address"
          className="hidden h-10 w-10 items-center justify-center rounded-full text-ob-faint transition hover:bg-ob-surface2 hover:text-ob-accent sm:flex"
        >
          {saved === value && value ? '★' : '☆'}
        </button>
        <button
          type="submit"
          className="h-10 rounded-full bg-ob-accent px-5 text-sm font-semibold text-ob-bg transition hover:brightness-110"
        >
          Check risk
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="address-listbox"
          role="listbox"
          aria-label="Address suggestions"
          className="ob-panel absolute z-50 mt-2 w-full overflow-hidden rounded-2xl py-1 text-left shadow-panel"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lng}`}
              id={`address-option-${i}`}
              role="option"
              aria-selected={i === active}
            >
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                  i === active ? 'bg-ob-accent/15 text-ob-accent' : 'text-ob-muted hover:bg-ob-surface2'
                }`}
              >
                <span className="text-ob-faint" aria-hidden>
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
