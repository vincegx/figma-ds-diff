'use client';

import { useState } from 'react';

interface PixelDiffOverlayProps {
  src: string;
  diffPct: number;
}

export function PixelDiffOverlay({ src, diffPct }: PixelDiffOverlayProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: '#08080f',
        borderRadius: 10,
        minHeight: 140,
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Checkerboard */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px',
        }}
      />

      {/* Diff image or fallback placeholders */}
      {!imgError ? (
        <img
          src={src}
          alt="Pixel diff overlay"
          className="relative w-full h-auto"
          style={{ minHeight: 140, objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <div
            className="absolute animate-pulse-soft"
            style={{
              top: '15%',
              left: '18%',
              width: '40%',
              height: '50%',
              background: 'color-mix(in srgb, var(--color-diff-highlight) 7%, transparent)',
              borderRadius: 6,
              border: '1.5px solid color-mix(in srgb, var(--color-diff-highlight) 19%, transparent)',
            }}
          />
          <div
            className="absolute animate-pulse-soft"
            style={{
              top: '50%',
              left: '65%',
              width: '22%',
              height: '30%',
              background: 'color-mix(in srgb, var(--color-diff-highlight) 5%, transparent)',
              borderRadius: 4,
              border: '1px solid color-mix(in srgb, var(--color-diff-highlight) 12%, transparent)',
              animationDelay: '0.4s',
            }}
          />
          <div style={{ height: 140 }} />
        </>
      )}

      {/* Scanline */}
      <div
        className="absolute left-0 right-0 animate-scanline"
        style={{
          height: 1,
          background:
            'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-diff-highlight) 25%, transparent), transparent)',
        }}
      />

      {/* Diff % indicator */}
      <div
        className="absolute flex items-center gap-1 font-mono"
        style={{
          top: 8,
          right: 10,
          fontSize: 9,
          fontWeight: 600,
          color: 'color-mix(in srgb, var(--color-diff-highlight) 70%, transparent)',
        }}
      >
        <span
          className="rounded-full animate-pulse-soft"
          style={{
            width: 5,
            height: 5,
            background: 'var(--color-diff-highlight)',
          }}
        />
        {diffPct}% pixels changed
      </div>
    </div>
  );
}
