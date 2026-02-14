'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReportData, ComponentDiff } from '@/types/report';
import type { ChangeType } from '@/lib/change-types';
import { useKeyboardNav } from '@/hooks/use-keyboard-nav';
import { ReportSidebar, type Tab } from './report-sidebar';
import { ComponentDetail } from './component-detail';
import { StylesTable } from './styles-table';
import { VariablesEmpty } from './variables-empty';
import { VariablesTable } from './variables-table';

interface ReportShellProps {
  data: ReportData;
  slug: string;
}

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export function ReportShell({ data, slug }: ReportShellProps) {
  const [selectedId, setSelectedId] = useState<string>(
    data.components[0]?.id ?? '',
  );
  const [typeOverride, setTypeOverride] = useState<ChangeType | null>(null);
  const [tab, setTab] = useState<Tab>('components');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  const items = data.components.map((c) => ({ id: c.id }));

  const handleSelect = useCallback((id: string, displayType?: ChangeType) => {
    setSelectedId(id);
    setTypeOverride(displayType ?? null);
    setDrawerOpen(false);
  }, []);

  const { selectNext } = useKeyboardNav({ items, selectedId, onSelect: handleSelect });

  // Scroll main to top on selection change or tab change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [selectedId, tab]);

  const rawComponent = data.components.find((c) => c.id === selectedId);
  const currentComponent: ComponentDiff | undefined = rawComponent && typeOverride
    ? { ...rawComponent, type: typeOverride }
    : rawComponent;

  const sidebarDesktop = (
    <ReportSidebar
      data={data}
      selectedId={selectedId}
      onSelect={handleSelect}
      tab={tab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
    />
  );

  const sidebarMobile = (
    <ReportSidebar
      data={data}
      selectedId={selectedId}
      onSelect={handleSelect}
      tab={tab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
      onClose={() => setDrawerOpen(false)}
    />
  );

  // Hamburger label
  const hamburgerLabel =
    tab === 'components' && currentComponent
      ? currentComponent.name
      : tab === 'styles'
        ? 'Styles'
        : 'Variables';

  return (
    <div className="flex flex-1 min-h-0">
      {/* Desktop sidebar */}
      {!isMobile && sidebarDesktop}

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-panel">
            {sidebarMobile}
          </div>
        </>
      )}

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="sticky top-0 z-30 flex items-center gap-2 w-full px-4 py-2.5"
            style={{
              background: 'var(--bg-panel)',
              borderBottom: '1px solid var(--border-default)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>☰</span>
            {hamburgerLabel}
          </button>
        )}

        {tab === 'components' ? (
          currentComponent ? (
            <ComponentDetail
              component={currentComponent}
              slug={slug}
              onNext={selectNext}
              constructorFileKey={data.meta.constructorFileKey}
              forkFileKey={data.meta.forkFileKey}
            />
          ) : (
            <EmptyMain message="Select a component from the sidebar" />
          )
        ) : tab === 'styles' ? (
          <StylesTable styles={data.styles} />
        ) : (data.variables?.length ?? 0) > 0 ? (
          <VariablesTable variables={data.variables!} />
        ) : (
          <VariablesEmpty />
        )}
      </main>
    </div>
  );
}

function EmptyMain({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ fontSize: 13, color: 'var(--text-tertiary)' }}
    >
      {message}
    </div>
  );
}
