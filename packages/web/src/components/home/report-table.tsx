'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportEntry } from '@/app/api/reports/route';

interface ReportTableProps {
  reports: ReportEntry[];
}

export function ReportTable({ reports }: ReportTableProps) {
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  const filtered = reports.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.fork.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {/* Header + search */}
      <div
        className="flex items-center justify-between mb-3 animate-fade-up"
        style={{ animationDelay: '0.12s' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Recent reports
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports…"
          className="font-sans text-[11px] w-[200px]"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '7px 12px',
            color: 'var(--text-primary)',
            transition: 'all 0.2s',
          }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-[14px] overflow-hidden animate-fade-up"
        style={{
          border: '1px solid var(--border-default)',
          animationDelay: '0.15s',
          overflowX: 'auto',
        }}
      >
        {/* Header row */}
        <div
          className="grid items-center px-5 py-2.5 text-[10px] font-bold uppercase"
          style={{
            gridTemplateColumns: '1fr 100px 70px 70px 70px 40px',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            letterSpacing: '0.07em',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <span>Report</span>
          <span>Date</span>
          <span className="text-center">&#8593; Up</span>
          <span className="text-center">&#8595; Local</span>
          <span className="text-center">&#9889;</span>
          <span />
        </div>

        {/* Data rows */}
        {filtered.map((r, i) => (
          <div
            key={r.slug}
            onClick={() => router.push(`/report/${r.slug}`)}
            onMouseEnter={() => setHovered(r.slug)}
            onMouseLeave={() => setHovered(null)}
            className="grid items-center px-5 cursor-pointer animate-fade-up"
            style={{
              gridTemplateColumns: '1fr 100px 70px 70px 70px 40px',
              padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              transition: 'background 0.12s',
              background: hovered === r.slug ? 'var(--bg-surface-hover)' : 'transparent',
              animationDelay: `${0.15 + i * 0.03}s`,
            }}
          >
            <div>
              <div className="text-[13px] font-semibold mb-0.5">
                {r.name}{' '}
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>vs</span>{' '}
                {r.fork}
              </div>
              {r.baseline && (
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Baseline: {r.baseline}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.date}</div>
              {r.time && (
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.time}</div>
              )}
            </div>
            <span
              className="text-center text-sm font-semibold"
              style={{ color: 'var(--color-upstream)' }}
            >
              {r.upstream}
            </span>
            <span
              className="text-center text-sm font-semibold"
              style={{ color: 'var(--color-local)' }}
            >
              {r.local}
            </span>
            <span
              className="text-center text-sm font-semibold"
              style={{ color: r.conflicts > 0 ? 'var(--color-conflict)' : 'var(--text-muted)' }}
            >
              {r.conflicts}
            </span>
            <span
              className="text-right text-[13px]"
              style={{
                color: hovered === r.slug ? 'var(--text-secondary)' : 'var(--text-muted)',
                transition: 'color 0.12s',
              }}
            >
              →
            </span>
          </div>
        ))}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-12 px-5 text-center animate-fade-up">
            {reports.length === 0 ? (
              <>
                <div
                  className="animate-pulse-soft"
                  style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}
                >
                  Δ
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  No reports yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Click <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>+ New</span> above to generate your first comparison ↗
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                No matching reports
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
