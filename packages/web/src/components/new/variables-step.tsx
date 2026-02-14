'use client';

import { useRef, useState, type DragEvent } from 'react';

interface VariablesStepProps {
  onBack: () => void;
  onSkip: () => void;
  onFiles: (constructor: File | null, fork: File | null) => void;
  initialFiles?: File[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function VariablesStep({ onBack, onSkip, onFiles, initialFiles = [] }: VariablesStepProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFiles = files.length > 0;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith('.json'),
    );
    if (dropped.length > 0) {
      setFiles(dropped);
      onFiles(dropped[0] ?? null, dropped[1] ?? null);
    }
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFiles(next[0] ?? null, next[1] ?? null);
  }

  return (
    <div className="animate-fade-up">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-[14px] text-center mb-4 cursor-pointer"
        style={{
          border: `2px dashed ${dragOver ? 'rgba(99,102,241,0.4)' : 'var(--border-default)'}`,
          padding: '44px 20px',
          transition: 'border-color 0.2s',
        }}
      >
        <div className="text-[26px] mb-2.5 opacity-35">↑</div>
        <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Drop variable JSON files
        </div>
        <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          Tokens Studio / DTCG format
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (selected.length > 0) {
            setFiles(selected);
            onFiles(selected[0] ?? null, selected[1] ?? null);
          }
        }}
      />

      {/* File list */}
      {hasFiles && (
        <div
          className="mb-4 animate-fade-up"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-3"
              style={{
                padding: '10px 14px',
                borderBottom: i < files.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}
            >
              {/* File icon */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'var(--color-new-bg)',
                  border: '1px solid var(--color-new-bd)',
                  fontSize: 11,
                }}
              >
                { }
              </div>
              {/* Name + size */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono truncate"
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  {f.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {formatSize(f.size)}
                </div>
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="shrink-0 flex items-center justify-center cursor-pointer"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  transition: 'all var(--duration-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-removed-bd)';
                  e.currentTarget.style.color = 'var(--color-removed)';
                  e.currentTarget.style.background = 'var(--color-removed-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2.5 justify-end">
        <button
          onClick={onBack}
          className="text-xs font-semibold cursor-pointer font-sans"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            padding: '10px 20px',
            borderRadius: 9,
          }}
        >
          ← Back
        </button>
        <button
          onClick={onSkip}
          className="text-white text-xs font-semibold cursor-pointer border-none font-sans"
          style={{
            background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
            padding: '10px 20px',
            borderRadius: 9,
          }}
        >
          {hasFiles ? 'Continue →' : 'Skip'}
        </button>
      </div>
    </div>
  );
}
