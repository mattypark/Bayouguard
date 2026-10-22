'use client';

/* Three-language support. The dictionaries are flat key -> string maps with
 * {param} placeholders; es and vi are typed against en, so a missing key is a
 * compile error. The choice persists to localStorage and sets <html lang>. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type MsgKey } from './en';
import { es } from './es';
import { vi } from './vi';

export const LANGS = ['en', 'es', 'vi'] as const;
export type Lang = (typeof LANGS)[number];
export type { MsgKey };
export type Params = Record<string, string | number>;

const DICTS: Record<Lang, Record<MsgKey, string>> = { en, es, vi };
const STORAGE_KEY = 'bayouguard_lang';
const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-US', vi: 'vi-VN' };

export function translate(lang: Lang, key: MsgKey, params?: Params): string {
  const raw = DICTS[lang][key] ?? en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    params[name] === undefined ? m : String(params[name]),
  );
}

interface I18n {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: MsgKey, params?: Params) => string;
  /** Locale-aware number formatting with fixed decimals. */
  num: (n: number, digits?: number) => string;
  time: (iso: string | Date) => string;
}

const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (LANGS as readonly string[]).includes(saved)) setLangState(saved as Lang);
    } catch {
      // Storage blocked: stay in English.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Not remembered, still applied.
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const locale = LOCALE[lang];
    return {
      lang,
      locale,
      setLang,
      t: (key, params) => translate(lang, key, params),
      num: (n, digits = 1) =>
        n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      time: (iso) =>
        new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <LanguageProvider>');
  return v;
}
