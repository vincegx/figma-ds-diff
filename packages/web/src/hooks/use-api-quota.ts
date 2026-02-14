'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuotaStats } from '@figma-ds-diff/core';

const DEFAULT_INTERVAL = 45_000; // 45 seconds

export function useApiQuota(refreshIntervalMs = DEFAULT_INTERVAL) {
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/quota');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as QuotaStats;
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), refreshIntervalMs);
    return () => clearInterval(id);
  }, [refresh, refreshIntervalMs]);

  return { stats, loading, error, refresh };
}
