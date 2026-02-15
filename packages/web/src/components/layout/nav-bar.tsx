import type { ReactNode } from 'react';
import Link from 'next/link';
import { QuotaIndicator } from '@/components/quota/quota-indicator';

interface NavBarProps {
  children?: ReactNode;
}

export function NavBar({ children }: NavBarProps) {
  return (
    <nav
      className="sticky top-0 z-50 h-nav flex items-center shrink-0 px-5 gap-4"
      style={{
        background: 'rgba(6, 6, 11, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Logo + brand */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
        >
          Δ
        </div>
        <span className="text-sm font-bold" style={{ letterSpacing: '-0.02em' }}>
          DiffLib
        </span>
        <span
          className="text-[9px] font-semibold rounded-[4px] ml-0.5"
          style={{
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            padding: '1px 6px',
            border: '1px solid var(--border-default)',
          }}
        >
          beta
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quota indicator + settings + page-specific actions */}
      <div className="flex items-center gap-3">
        <QuotaIndicator />
        <div style={{ width: 4 }} />
        <Link
          href="/settings"
          className="flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-tertiary)',
            fontSize: 18,
            transition: 'all var(--duration-fast)',
          }}
          aria-label="Settings"
        >
          ⚙
        </Link>
        {children}
      </div>
    </nav>
  );
}
