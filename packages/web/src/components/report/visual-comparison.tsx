'use client';

import { useState } from 'react';
import type { ComponentDiff } from '@/types/report';
import { PixelDiffOverlay } from './pixel-diff-overlay';

type Mode = 'side' | 'overlay';

interface VisualComparisonProps {
  component: ComponentDiff;
  slug: string;
}

export function VisualComparison({ component, slug }: VisualComparisonProps) {
  const [mode, setMode] = useState<Mode>('side');
  const isConflict = component.type === 'conflict';
  const imgBase = `/api/reports/${slug}/images`;

  return (
    <div style={{ padding: '0 28px 18px' }}>
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="uppercase tracking-wider"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.07em',
          }}
        >
          Visual Comparison
        </span>
        <div
          className="flex gap-0.5"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 7,
            padding: 2,
            border: '1px solid var(--border-default)',
          }}
        >
          <ToggleButton active={mode === 'side'} onClick={() => setMode('side')}>
            Side by side
          </ToggleButton>
          <ToggleButton active={mode === 'overlay'} onClick={() => setMode('overlay')}>
            Pixel diff
          </ToggleButton>
        </div>
      </div>

      {/* Content */}
      {mode === 'side' ? (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: isConflict ? '1fr 1fr 1fr' : '1fr 1fr',
          }}
        >
          <ImageColumn
            label="Upstream"
            color="var(--color-upstream)"
            src={component.images.upstream ? `${imgBase}/${component.images.upstream}` : undefined}
            variant="upstream"
          />
          <ImageColumn
            label="Local"
            color="var(--color-local)"
            src={component.images.local ? `${imgBase}/${component.images.local}` : undefined}
            variant="local"
          />
          {isConflict && (
            <ImageColumn
              label="Base"
              color="var(--text-muted)"
              src={component.images.base ? `${imgBase}/${component.images.base}` : undefined}
              variant="base"
            />
          )}
        </div>
      ) : (
        <PixelDiffOverlay
          src={component.images.diff ? `${imgBase}/${component.images.diff}` : ''}
          diffPct={component.diffPct}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer font-sans"
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 5,
        border: 'none',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      {children}
    </button>
  );
}

function ImageColumn({
  label,
  color,
  src,
  variant,
}: {
  label: string;
  color: string;
  src?: string;
  variant: 'base' | 'upstream' | 'local';
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      <div
        className="uppercase tracking-wider mb-1"
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      {src && !imgError ? (
        <img
          src={src}
          alt={`${label} render`}
          className="w-full h-auto rounded-[10px]"
          style={{
            border: '1px solid var(--border-default)',
            background: 'var(--bg-panel)',
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <RenderPlaceholder variant={variant} />
      )}
    </div>
  );
}

function RenderPlaceholder({ variant }: { variant: 'base' | 'upstream' | 'local' }) {
  const palettes = {
    base: { bg: '#0e0e16', fg: '#3a3a52', ac: '#55557a' },
    upstream: { bg: '#0c1020', fg: '#2a4a8a', ac: 'var(--color-upstream-deep)' },
    local: { bg: '#0c1a10', fg: '#2a6a3a', ac: 'var(--color-local-deep)' },
  };
  const c = palettes[variant];

  return (
    <div
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{
        background: c.bg,
        borderRadius: 10,
        height: 140,
        border: `1px solid ${c.fg}30`,
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${c.fg}18, transparent 70%)`,
        }}
      />
      {/* Wireframe shapes */}
      <div className="flex flex-col items-center gap-1.5 relative">
        <div
          style={{
            width: 80,
            height: 28,
            borderRadius: 7,
            background: `${c.fg}30`,
            border: `1.5px solid ${c.fg}55`,
          }}
        />
        <div className="flex gap-1">
          <div style={{ width: 24, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
          <div style={{ width: 36, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
          <div style={{ width: 18, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
        </div>
      </div>
      {/* Label */}
      <div
        className="absolute bottom-1.5 left-0 right-0 text-center uppercase tracking-wider font-sans"
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: `${c.fg}80`,
          letterSpacing: '0.08em',
        }}
      >
        {variant}
      </div>
    </div>
  );
}
