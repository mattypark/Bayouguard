'use client';

/* Fetch one of our /api routes that answers { data, source }. Null url means
 * "not yet" (nothing is fetched). 204 means "nothing to show". */

import { useCallback, useEffect, useState } from 'react';
import type { EndpointSource } from './endpoints';

export interface EndpointState<T> {
  data: T | null;
  source: EndpointSource | null;
  via?: string;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function useEndpoint<T>(url: string | null): EndpointState<T> {
  const [state, setState] = useState<Omit<EndpointState<T>, 'retry'>>({
    data: null,
    source: null,
    loading: Boolean(url),
    error: false,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: false }));
    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 204) return { data: null, source: null };
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((body: { data: T | null; source: EndpointSource | null; via?: string }) =>
        setState({ data: body.data, source: body.source, via: body.via, loading: false, error: false }),
      )
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setState({ data: null, source: null, loading: false, error: true });
      });
    return () => controller.abort();
  }, [url, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}
