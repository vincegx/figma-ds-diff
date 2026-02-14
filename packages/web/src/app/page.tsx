import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReportList } from '@/components/report-list';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Figma DS Diff</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compare two Figma design system libraries
          </p>
        </div>
        <Link href="/new">
          <Button>New Comparison</Button>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Reports</h2>
        <ReportList />
      </section>
    </div>
  );
}
