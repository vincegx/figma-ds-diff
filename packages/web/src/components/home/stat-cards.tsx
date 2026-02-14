import { StatCard } from '@/components/shared/stat-card';
import type { ReportEntry } from '@/app/api/reports/route';

interface StatCardsProps {
  reports: ReportEntry[];
}

export function StatCards({ reports }: StatCardsProps) {
  const totalUpstream = reports.reduce((s, r) => s + r.upstream, 0);
  const totalConflicts = reports.reduce((s, r) => s + r.conflicts, 0);
  const totalComponents = reports.reduce((s, r) => s + r.total, 0);
  const synced = totalComponents > 0
    ? Math.round(((totalComponents - totalConflicts) / totalComponents) * 100)
    : 100;

  return (
    <div
      className="flex flex-wrap gap-3 mb-9 animate-fade-up"
      style={{ animationDelay: '0.08s' }}
    >
      <StatCard label="Reports" value={reports.length} color="var(--text-primary)" sub="total" />
      <StatCard label="Latest Changes" value={totalUpstream} color="var(--color-upstream)" sub="components" />
      <StatCard label="Open Conflicts" value={totalConflicts} color="var(--color-conflict)" sub="to resolve" />
      <StatCard label="Coverage" value={`${synced}%`} color="var(--color-local)" sub="synced" />
    </div>
  );
}
