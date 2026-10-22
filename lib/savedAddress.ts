/* The one saved address, shared by the search box, the address card's Save
 * button and the shelters page's distance sort. Same-tab listeners hear
 * changes through a custom event; other tabs through `storage`. */

export interface SavedAddress {
  label: string;
  lat?: number;
  lng?: number;
}

const KEY = 'bayouguard_saved_address';
const EVENT = 'bayouguard:saved-address';

export function readSaved(): SavedAddress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    // Older versions stored the bare label.
    if (!raw.startsWith('{')) return { label: raw };
    const v = JSON.parse(raw) as SavedAddress;
    return typeof v?.label === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function writeSaved(value: SavedAddress | null): void {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Not remembered; nothing else to do.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onSavedChange(cb: () => void): () => void {
  const storage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', storage);
  };
}

const LAST_KEY = 'bayouguard_last_search';

/** The most recent searched address with coordinates, for distance sorting. */
export function writeLastSearch(v: SavedAddress): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v));
  } catch {
    // Optional.
  }
}

export function readLastSearch(): SavedAddress | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as SavedAddress) : null;
  } catch {
    return null;
  }
}
