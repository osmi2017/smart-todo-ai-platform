import { useCallback, useEffect, useRef, useState } from 'react';

export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const load = useCallback(async (mode = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const result = await fetchRef.current();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load('initial');
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load('initial'),
    refresh: () => load('refresh'),
    setData,
  };
}

export function useMutation(fn, onSuccess) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await fn(...args);
        if (onSuccess) await onSuccess(result);
        return result;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [fn, onSuccess]
  );

  return { run, submitting, error, setError };
}