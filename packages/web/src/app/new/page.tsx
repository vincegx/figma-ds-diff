import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { InputForm } from '@/components/input-form';

export default function NewComparisonPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to reports
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Comparison</CardTitle>
          <CardDescription>
            Paste the Figma URLs for the constructor library and your forked copy.
            The tool will fetch both files, resolve the baseline version, and generate a visual diff report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InputForm />
        </CardContent>
      </Card>
    </div>
  );
}
