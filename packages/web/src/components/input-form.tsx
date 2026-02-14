'use client';

import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressDisplay } from '@/components/progress-display';

export function InputForm() {
  const router = useRouter();
  const [constructorUrl, setConstructorUrl] = useState('');
  const [forkUrl, setForkUrl] = useState('');
  const [constructorVarFile, setConstructorVarFile] = useState<File | null>(null);
  const [forkVarFile, setForkVarFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isValidFigmaUrl = (url: string) =>
    /figma\.com\/(design|file|board|proto)\//.test(url);

  const canSubmit =
    !running &&
    constructorUrl.trim() !== '' &&
    forkUrl.trim() !== '' &&
    isValidFigmaUrl(constructorUrl) &&
    isValidFigmaUrl(forkUrl);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setRunning(true);
    setSteps([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Read variable JSON files if provided
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

      // Read SSE stream
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
              setSteps((prev) => [...prev, data['step'] as string]);
            } else if (currentEvent === 'error') {
              setError(data['message'] as string);
              setRunning(false);
              return;
            } else if (currentEvent === 'complete') {
              const slug = data['slug'] as string;
              setSteps((prev) => [...prev, 'Report generated! Redirecting...']);
              // Short delay to show the final message
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

  function handleCancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  function handleDrop(setter: (file: File | null) => void) {
    return (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        setter(file);
      }
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Constructor Library URL
          </label>
          <Input
            type="url"
            placeholder="https://www.figma.com/design/..."
            value={constructorUrl}
            onChange={(e) => setConstructorUrl(e.target.value)}
            disabled={running}
          />
          {constructorUrl && !isValidFigmaUrl(constructorUrl) && (
            <p className="text-xs text-red-400 mt-1">Not a valid Figma file URL</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Forked Library URL
          </label>
          <Input
            type="url"
            placeholder="https://www.figma.com/design/..."
            value={forkUrl}
            onChange={(e) => setForkUrl(e.target.value)}
            disabled={running}
          />
          {forkUrl && !isValidFigmaUrl(forkUrl) && (
            <p className="text-xs text-red-400 mt-1">Not a valid Figma file URL</p>
          )}
        </div>
      </div>

      {/* Variable JSON Dropzones */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Optional: Upload variable JSON exports for variable diff
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div
            onDrop={handleDrop(setConstructorVarFile)}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = () => {
                if (input.files?.[0]) setConstructorVarFile(input.files[0]);
              };
              input.click();
            }}
          >
            {constructorVarFile ? (
              <span className="text-foreground">{constructorVarFile.name}</span>
            ) : (
              'Constructor variables (.json)'
            )}
          </div>
          <div
            onDrop={handleDrop(setForkVarFile)}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = () => {
                if (input.files?.[0]) setForkVarFile(input.files[0]);
              };
              input.click();
            }}
          >
            {forkVarFile ? (
              <span className="text-foreground">{forkVarFile.name}</span>
            ) : (
              'Fork variables (.json)'
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {running ? 'Comparing...' : 'Compare'}
        </Button>
        {running && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Progress */}
      {(steps.length > 0 || error) && (
        <ProgressDisplay steps={steps} error={error} />
      )}
    </form>
  );
}
