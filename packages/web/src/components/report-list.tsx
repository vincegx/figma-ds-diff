'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportEntry {
  slug: string;
  name: string;
  date: string;
  time: string;
  hasData: boolean;
}

export function ReportList() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data: { reports?: ReportEntry[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReports(data.reports ?? []);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch on mount + refetch when tab/page becomes visible again
  useEffect(() => {
    fetchReports();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchReports();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchReports);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchReports);
    };
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No reports yet</p>
        <p className="text-sm mt-1">Create a new comparison to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <Link
          key={report.slug}
          href={`/report/${report.slug}`}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
        >
          <div>
            <p className="font-medium text-card-foreground">{report.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{report.date}{report.time ? ` ${report.time}` : ''}</p>
          </div>
          <Badge>View</Badge>
        </Link>
      ))}
    </div>
  );
}
