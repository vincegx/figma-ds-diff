'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NavBar } from '@/components/layout/nav-bar';
import { StepIndicator } from '@/components/new/step-indicator';
import { UrlStep } from '@/components/new/url-step';
import { VariablesStep } from '@/components/new/variables-step';
import { GenerateStep } from '@/components/new/generate-step';
import { ProcessingView } from '@/components/new/processing-view';

const isValidFigmaUrl = (url: string) =>
  /figma\.com\/(design|file|board|proto)\//.test(url);

export default function NewComparisonPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  const [constructorUrl, setConstructorUrl] = useState('');
  const [forkUrl, setForkUrl] = useState('');
  const [constructorVarFile, setConstructorVarFile] = useState<File | null>(null);
  const [forkVarFile, setForkVarFile] = useState<File | null>(null);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const urlsValid =
    constructorUrl.trim() !== '' &&
    forkUrl.trim() !== '' &&
    isValidFigmaUrl(constructorUrl) &&
    isValidFigmaUrl(forkUrl);

  async function handleGenerate() {
    setRunning(true);
    setProgressSteps([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let constructorVariablesJson: string | undefined;
    let forkVariablesJson: string | undefined;

    if (constructorVarFile) {
      constructorVariablesJson = await constructorVarFile.text();
    }
    if (forkVarFile) {
      forkVariablesJson = await forkVarFile.text();
    }

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constructorUrl,
          forkUrl,
          constructorVariablesJson,
          forkVariablesJson,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setError(`Server error: ${response.status}`);
        setRunning(false);
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
              setError(data['message'] as string);
              setRunning(false);
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
        setError(err instanceof Error ? err.message : 'Comparison failed');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar>
        <Link
          href="/"
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
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }}
          aria-label="Close and return to home"
        >
          ✕
        </Link>
      </NavBar>

      <div
        className="mx-auto animate-fade-up"
        style={{ maxWidth: 680, padding: '0 32px' }}
      >
        {/* Page header */}
        <div style={{ padding: '44px 0 28px' }}>
          <h2
            className="text-[26px] font-bold mb-1.5"
            style={{ letterSpacing: '-0.03em' }}
          >
            New Comparison
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Paste both Figma library URLs to generate a three-way diff report.
          </p>
        </div>

        <StepIndicator current={step} />

        {!running && step === 1 && (
          <UrlStep
            constructorUrl={constructorUrl}
            forkUrl={forkUrl}
            onConstructorChange={setConstructorUrl}
            onForkChange={setForkUrl}
            onContinue={() => setStep(2)}
            isValid={urlsValid}
          />
        )}

        {!running && step === 2 && (
          <VariablesStep
            onBack={() => setStep(1)}
            onSkip={() => setStep(3)}
            onFiles={(c, f) => {
              setConstructorVarFile(c);
              setForkVarFile(f);
            }}
            initialFiles={[constructorVarFile, forkVarFile].filter((f): f is File => f !== null)}
          />
        )}

        {!running && step === 3 && (
          <GenerateStep onGenerate={handleGenerate} onBack={() => setStep(2)} />
        )}

        {(running || error) && (
          <ProcessingView
            steps={progressSteps}
            error={error}
            onRetry={() => {
              setRunning(false);
              setError(null);
              setProgressSteps([]);
              setStep(3);
            }}
          />
        )}
      </div>
    </div>
  );
}
