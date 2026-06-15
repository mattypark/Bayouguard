'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bayouguard_saved_address';

export default function AddressSearch({
  onSearch,
}: {
  onSearch?: (addr: string) => void;
}) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      setValue(v);
      setSaved(v);
      onSearch?.(v);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!value) return;
    localStorage.setItem(STORAGE_KEY, value);
    setSaved(value);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value) onSearch?.(value);
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-cs-border bg-white p-1.5 pl-5 shadow-sm focus-within:border-cs-teal focus-within:ring-2 focus-within:ring-cs-teal/30"
    >
      <span className="text-cs-steel" aria-hidden>
        🔎
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your Houston address…"
        aria-label="Search address"
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-cs-steel"
      />
      <button
        type="button"
        onClick={save}
        title={saved === value && value ? 'Saved' : 'Save address'}
        aria-label="Save address"
        className="hidden h-10 w-10 items-center justify-center rounded-full text-cs-steel hover:bg-cs-sky sm:flex"
      >
        {saved === value && value ? '★' : '☆'}
      </button>
      <button
        type="submit"
        className="h-10 rounded-full bg-cs-navy px-5 text-sm font-semibold text-white transition hover:bg-cs-navy/90"
      >
        Check risk
      </button>
    </form>
  );
}
