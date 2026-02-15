'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ProcessingView } from '@/components/new/processing-view';

interface RegenerateButtonProps {
  constructorFileKey?: string;
  forkFileKey?: string;
}

type OverlayState = 'idle' | 'confirm' | 'running' | 'error';

export function RegenerateButton({ constructorFileKey, forkFileKey }: RegenerateButtonProps) {
  const router = useRouter();
  const [overlayState, setOverlayState] = useState<OverlayState>('idle');
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const disabled = !constructorFileKey || !forkFileKey;

  // Grab document.body on mount for portal
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  async function startRegeneration() {
    if (disabled) return;

    setOverlayState('running');
    setProgressSteps([]);
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constructorUrl: `https://www.figma.com/design/${constructorFileKey}`,
          forkUrl: `https://www.figma.com/design/${forkFileKey}`,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setErrorMsg(`Server error: ${response.status}`);
        setOverlayState('error');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

            if (currentEvent === 'progress') {
              setProgressSteps((prev) => [...prev, data['step'] as string]);
            } else if (currentEvent === 'error') {
              setErrorMsg(data['message'] as string);
              setOverlayState('error');
              return;
            } else if (currentEvent === 'complete') {
              const slug = data['slug'] as string;
              setProgressSteps((prev) => [...prev, 'Report generated! Redirecting…']);
              setTimeout(() => router.push(`/report/${slug}`), 800);
              return;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setErrorMsg(err instanceof Error ? err.message : 'Regeneration failed');
        setOverlayState('error');
      }
    } finally {
      abortRef.current = null;
    }
  }

  function dismiss() {
    if (abortRef.current) abortRef.current.abort();
    setOverlayState('idle');
    setProgressSteps([]);
    setErrorMsg(null);
  }

  if (disabled) return null;

  const overlay = overlayState !== 'idle' && portalRoot
    ? createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 9999,
            background: 'rgba(6, 6, 11, 0.6)',
            backdropFilter: 'blur(24px) saturate(0.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(0.5)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && overlayState === 'confirm') dismiss();
          }}
        >
          {/* Card */}
          <div
            className="animate-fade-up"
            style={{
              width: '100%',
              maxWidth: overlayState === 'confirm' ? 440 : 540,
              margin: '0 20px',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(18, 18, 26, 0.85)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
              overflow: 'hidden',
            }}
          >
            {/* Confirmation prompt */}
            {overlayState === 'confirm' && (
              <div style={{ padding: '28px 28px 24px' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  >
                    Δ
                  </div>
                  <span className="text-[15px] font-bold" style={{ letterSpacing: '-0.02em' }}>
                    Regenerate Report
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    marginBottom: 6,
                  }}
                >
                  This will re-run the full comparison from Figma and generate a new report with fresh renders.
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  Variable diffs will be skipped (variables are user-uploaded).
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => void startRegeneration()}
                    className="cursor-pointer font-sans flex-1"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#fff',
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                    }}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={dismiss}
                    className="cursor-pointer font-sans flex-1"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-tertiary)',
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: '1px solid var(--border-default)',
                      background: 'transparent',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Progress view */}
            {(overlayState === 'running' || overlayState === 'error') && (
              <div style={{ padding: '24px 24px 20px' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  >
                    Δ
                  </div>
                  <span className="text-[15px] font-bold" style={{ letterSpacing: '-0.02em' }}>
                    Regenerating…
                  </span>
                </div>

                <ProcessingView
                  steps={progressSteps}
                  error={errorMsg}
                  onRetry={() => {
                    setErrorMsg(null);
                    void startRegeneration();
                  }}
                />

                {overlayState === 'error' && (
                  <button
                    onClick={dismiss}
                    className="mt-3 text-xs font-sans cursor-pointer"
                    style={{
                      color: 'var(--text-tertiary)',
                      background: 'none',
                      border: 'none',
                      padding: '4px 8px',
                    }}
                  >
                    Back to report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        portalRoot,
      )
    : null;

  return (
    <>
      <button
        onClick={() => setOverlayState('confirm')}
        className="cursor-pointer font-sans"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 6,
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
        }}
      >
        Regenerate
      </button>
      {overlay}
    </>
  );
}
