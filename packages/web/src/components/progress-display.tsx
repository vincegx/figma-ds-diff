'use client';

import { useEffect, useRef } from 'react';

interface ProgressDisplayProps {
  steps: string[];
  error: string | null;
}

export function ProgressDisplay({ steps, error }: ProgressDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps.length]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 border-b border-border bg-muted">
        <h3 className="text-sm font-medium text-card-foreground">
          {error ? 'Comparison failed' : steps.length > 0 ? 'Progress' : 'Starting...'}
        </h3>
      </div>
      <div className="p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-muted-foreground select-none shrink-0">
              {i === steps.length - 1 && !error ? '>' : '\u2713'}
            </span>
            <span
              className={
                step.startsWith('Warning:')
                  ? 'text-yellow-400'
                  : i === steps.length - 1
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              }
            >
              {step}
            </span>
          </div>
        ))}
        {error && (
          <div className="flex items-start gap-2 text-red-400">
            <span className="select-none shrink-0">{'\u2717'}</span>
            <span>{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
