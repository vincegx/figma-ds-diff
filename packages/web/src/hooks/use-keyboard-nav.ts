'use client';

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavOptions {
  items: { id: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function useKeyboardNav({ items, selectedId, onSelect }: UseKeyboardNavOptions) {
  const selectNext = useCallback(() => {
    if (items.length === 0) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx < items.length - 1) {
      onSelect(items[idx + 1]!.id);
    }
  }, [items, selectedId, onSelect]);

  const selectPrev = useCallback(() => {
    if (items.length === 0) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx > 0) {
      onSelect(items[idx - 1]!.id);
    }
  }, [items, selectedId, onSelect]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'j') {
        e.preventDefault();
        selectNext();
      } else if (e.key === 'k') {
        e.preventDefault();
        selectPrev();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNext, selectPrev]);

  return { selectNext, selectPrev };
}
