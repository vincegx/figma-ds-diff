'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center animate-fade-in"
      style={{
        zIndex: 9999,
        background: 'rgba(6, 6, 11, 0.6)',
        backdropFilter: 'blur(24px) saturate(0.5)',
        WebkitBackdropFilter: 'blur(24px) saturate(0.5)',
        cursor: 'zoom-out',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute flex items-center justify-center cursor-pointer"
        style={{
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          fontSize: 18,
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ✕
      </button>

      <img
        src={src}
        alt={alt}
        className="animate-fade-up"
        style={{
          maxWidth: 'calc(100vw - 80px)',
          maxHeight: 'calc(100vh - 80px)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
          objectFit: 'contain',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    portalRoot,
  );
}

/**
 * Wraps an image with a hover button that opens the lightbox.
 */
export function ZoomableImage({
  src,
  alt,
  className,
  style,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="group relative">
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          onError={onError}
        />
        {/* Hover zoom button */}
        <button
          onClick={() => setOpen(true)}
          className="absolute opacity-0 group-hover:opacity-100 cursor-zoom-in flex items-center justify-center"
          style={{
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.15s ease',
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Zoom image"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
            <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="7" x2="9" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7" y1="5" x2="7" y2="9" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
