'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';
import type { ReportData, ComponentDiff } from '@/types/report';
import { StatusDot } from '@/components/shared/status-dot';
import { PropStatusBadge } from '@/components/shared/prop-status-badge';
import { SidebarItem } from './sidebar-item';

export type Tab = 'components' | 'styles' | 'variables';

/** Group ordering: Conflicts → Upstream → New → Local → Removed */
const GROUP_ORDER: ChangeType[] = ['conflict', 'upstream', 'new_upstream', 'local', 'deleted_upstream'];

interface ReportSidebarProps {
  data: ReportData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function ReportSidebar({
  data,
  selectedId,
  onSelect,
  tab,
  onTabChange,
  search,
  onSearchChange,
}: ReportSidebarProps) {
  const filtered = useMemo(() => {
    if (!search) return data.components;
    const q = search.toLowerCase();
    return data.components.filter(
      (c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }, [data.components, search]);

  const groups = useMemo(() => {
    const map = new Map<ChangeType, ComponentDiff[]>();
    for (const comp of filtered) {
      const list = map.get(comp.type) ?? [];
      list.push(comp);
      map.set(comp.type, list);
    }
    return GROUP_ORDER
      .filter((type) => map.has(type))
      .map((type) => ({ type, items: map.get(type)! }));
  }, [filtered]);

  const filteredStyles = useMemo(() => {
    if (!search) return data.styles;
    const q = search.toLowerCase();
    return data.styles.filter((s) => s.name.toLowerCase().includes(q));
  }, [data.styles, search]);

  const componentCount = data.components.length;
  const styleCount = data.styles.length;
  const variableCount = data.variables?.length ?? 0;

  return (
    <aside
      className="flex flex-col shrink-0 h-full"
      style={{
        width: 'var(--sidebar-width)',
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-panel)',
      }}
    >
      {/* ── 1. Info block ── */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1 mb-2 transition-colors"
          style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          ← Back to reports
        </Link>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }} className="truncate">
          {data.meta.constructorName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }} className="mt-0.5">
          vs{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{data.meta.forkName}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="mt-1">
          Baseline: {new Date(data.meta.baseline).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* ── 2. Tabs ── */}
      <div
        className="shrink-0 flex gap-0 px-4"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <TabButton
          label="Components"
          count={componentCount}
          active={tab === 'components'}
          onClick={() => onTabChange('components')}
        />
        <TabButton
          label="Styles"
          count={styleCount}
          active={tab === 'styles'}
          onClick={() => onTabChange('styles')}
        />
        <TabButton
          label="Variables"
          count={variableCount}
          active={tab === 'variables'}
          onClick={() => onTabChange('variables')}
        />
      </div>

      {/* ── 3. Search ── */}
      <div className="shrink-0 px-3 py-2">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full outline-none"
          style={{
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 7,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* ── 4. Grouped list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tab === 'components' ? (
          groups.length > 0 ? (
            groups.map((group, gi) => (
              <div
                key={group.type}
                className="animate-fade-up"
                style={{ animationDelay: `${gi * 60}ms` }}
              >
                <GroupHeader type={group.type} count={group.items.length} />
                {group.items.map((comp) => (
                  <SidebarItem
                    key={comp.id}
                    name={comp.name}
                    type={comp.type}
                    diffPct={comp.diffPct}
                    active={comp.id === selectedId}
                    onClick={() => onSelect(comp.id)}
                  />
                ))}
              </div>
            ))
          ) : (
            <div className="px-2 py-6 text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              No components match
            </div>
          )
        ) : tab === 'styles' ? (
          filteredStyles.length > 0 ? (
          filteredStyles.map((s, i) => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 animate-fade-up"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                animationDelay: `${i * 20}ms`,
              }}
            >
              <StatusDot type={s.status} size={5} />
              {s.type === 'color' && (
                <div
                  className="shrink-0"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: s.status === 'upstream' ? s.upstream : s.local,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
              )}
              <span
                className="font-mono flex-1 truncate"
                style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}
              >
                {s.name}
              </span>
              <PropStatusBadge status={s.status} />
            </div>
          ))
        ) : (
          <div className="px-2 py-6 text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {data.styles.length === 0 ? 'No style changes' : 'No styles match'}
          </div>
        )
        ) : (
          <div className="px-2 py-6 text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {variableCount === 0 ? 'No variable data' : `${variableCount} variables`}
          </div>
        )}
      </div>

      {/* ── 5. Keyboard hints ── */}
      <div
        className="shrink-0 flex items-center justify-center gap-3 py-2"
        style={{ borderTop: '1px solid var(--border-default)', fontSize: 10, color: 'var(--text-muted)' }}
      >
        <span className="flex items-center gap-1">
          <Kbd>J</Kbd> next
        </span>
        <span className="flex items-center gap-1">
          <Kbd>K</Kbd> prev
        </span>
      </div>
    </aside>
  );
}

/* ── Sub-components ── */

function TabButton({ label, count, active, onClick }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative pb-2 pt-2.5 px-1 mr-4 cursor-pointer transition-colors"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--color-upstream-deep)' : '2px solid transparent',
        background: 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      {label}
      <span
        className="ml-1.5 rounded-full inline-flex items-center justify-center"
        style={{
          fontSize: 9,
          fontWeight: 700,
          minWidth: 16,
          height: 16,
          padding: '0 4px',
          background: active ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
          color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function GroupHeader({ type, count }: { type: ChangeType; count: number }) {
  const config = CHANGE_TYPES[type];

  return (
    <div
      className="flex items-center gap-1.5 px-2 pt-3 pb-1"
      style={{ fontSize: 10, fontWeight: 700, color: `var(--color-${config.colorVar})` }}
    >
      <span>{config.icon}</span>
      <span className="uppercase tracking-wider">{config.label}</span>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({count})</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center font-mono"
      style={{
        fontSize: 9,
        fontWeight: 600,
        minWidth: 18,
        height: 18,
        borderRadius: 4,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </kbd>
  );
}
