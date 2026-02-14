'use client';

import { useEffect, useRef, useState } from 'react';

interface ProcessingViewProps {
  steps: string[];
  error: string | null;
  onRetry?: () => void;
}

/** Estimated total steps for a typical comparison run */
const ESTIMATED_TOTAL = 15;

function useElapsed(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    if (!running) return;
    start.current = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start.current), 200);
    return () => clearInterval(id);
  }, [running]);

  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
}

function isWarning(step: string): boolean {
  return step.toLowerCase().startsWith('warning:');
}

function isInfo(step: string): boolean {
  return step.startsWith('Baseline found:') || step.startsWith('Diff complete:') || step.startsWith('Using two-way');
}

export function ProcessingView({ steps, error, onRetry }: ProcessingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = !error && !steps.some((s) => s.includes('Redirecting'));
  const elapsed = useElapsed(isRunning);
  const isDone = steps.some((s) => s.includes('Redirecting'));

  // Auto-scroll to bottom on new step
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length]);

  // Progress percentage: smoothly approaches 100%, snaps on done
  const rawPct = isDone
    ? 100
    : Math.min((steps.length / Math.max(steps.length + 3, ESTIMATED_TOTAL)) * 100, 95);

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {!error && !isDone && (
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse-soft shrink-0"
              style={{ background: 'var(--color-new)' }}
            />
          )}
          {isDone && (
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: 'var(--color-local)' }}
            />
          )}
          {error && (
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: 'var(--color-removed)' }}
            />
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: error
                ? 'var(--color-removed)'
                : isDone
                  ? 'var(--color-local)'
                  : 'var(--text-primary)',
            }}
          >
            {error ? 'Comparison failed' : isDone ? 'Report ready!' : 'Comparing...'}
          </span>
        </div>
        <span
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}
        >
          {elapsed}
        </span>
      </div>

      {/* Progress bar — linked to actual step count */}
      <div
        className="h-[3px] rounded-full overflow-hidden mb-5"
        style={{ background: 'var(--border-default)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${error ? rawPct : rawPct}%`,
            background: error
              ? 'var(--color-removed)'
              : isDone
                ? 'var(--color-local)'
                : 'linear-gradient(90deg, var(--accent-from), var(--accent-to))',
            transition: 'width 0.4s var(--ease-default)',
          }}
        />
      </div>

      {/* Steps list */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-0.5 overflow-y-auto"
        style={{
          maxHeight: 340,
          borderRadius: 10,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '6px 0',
        }}
      >
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const active = isLast && isRunning;
          const warn = isWarning(step);
          const info = isInfo(step);

          let iconBg: string;
          let iconColor: string;
          let icon: string;

          if (warn) {
            iconBg = 'var(--color-conflict-bg)';
            iconColor = 'var(--color-conflict)';
            icon = '!';
          } else if (active) {
            iconBg = 'var(--color-new-bg)';
            iconColor = 'var(--color-new)';
            icon = '⋯';
          } else {
            iconBg = 'var(--color-local-bg)';
            iconColor = 'var(--color-local)';
            icon = '✓';
          }

          return (
            <div
              key={i}
              className="flex items-center gap-2.5 animate-fade-up"
              style={{
                padding: '6px 14px',
                animationDelay: '0s',
                animationDuration: '0.15s',
              }}
            >
              <div
                className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: iconBg,
                  color: iconColor,
                }}
              >
                {icon}
              </div>
              <span
                className={info ? 'font-mono' : ''}
                style={{
                  fontSize: 12,
                  color: warn
                    ? 'var(--color-conflict)'
                    : active
                      ? 'var(--text-primary)'
                      : info
                        ? 'var(--text-tertiary)'
                        : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {warn ? step.replace(/^Warning:\s*/, '') : step}
              </span>
            </div>
          );
        })}

        {/* Error row inside the list */}
        {error && (
          <div
            className="flex items-center gap-2.5 animate-fade-up"
            style={{ padding: '6px 14px' }}
          >
            <div
              className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0"
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'var(--color-removed-bg)',
                color: 'var(--color-removed)',
              }}
            >
              ✕
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-removed)' }}>
              {error}
            </span>
          </div>
        )}
      </div>

      {/* Retry button */}
      {error && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-xs font-semibold cursor-pointer font-sans"
          style={{
            background: 'var(--color-removed-bg)',
            color: 'var(--color-removed)',
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid var(--color-removed-bd)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
