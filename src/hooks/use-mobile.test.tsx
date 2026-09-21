import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

function stubViewport(width: number) {
  const listeners = new Set<() => void>();
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: window.innerWidth < 768,
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    resize(next: number) {
      window.innerWidth = next;
      listeners.forEach((cb) => cb());
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useIsMobile', () => {
  it.each([
    [375, true],
    [767, true],
    [768, false],
    [1440, false],
  ])('reports a %ipx viewport as mobile=%s', (width, expected) => {
    stubViewport(width);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(expected);
  });

  it('updates when the viewport crosses the breakpoint, and stops listening on unmount', () => {
    const viewport = stubViewport(1200);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => viewport.resize(500));
    expect(result.current).toBe(true);

    unmount();
    expect(viewport.listenerCount()).toBe(0);
  });
});
