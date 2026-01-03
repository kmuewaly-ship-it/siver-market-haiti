import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCartSync } from './useCartSync';

describe('useCartSync', () => {
  let mockCallback: () => void;

  beforeEach(() => {
    mockCallback = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize without errors', () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    expect(result.current.broadcastCartUpdate).toBeDefined();
  });

  it('should have broadcastCartUpdate function', () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    expect(typeof result.current.broadcastCartUpdate).toBe('function');
  });

  it('should broadcast B2C cart update', () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    result.current.broadcastCartUpdate('b2c');

    expect(setItemSpy).toHaveBeenCalledWith(
      'b2c_cart_sync',
      expect.stringContaining('"source":"b2c"')
    );

    setItemSpy.mockRestore();
  });

  it('should broadcast B2B cart update', () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    result.current.broadcastCartUpdate('b2b');

    expect(setItemSpy).toHaveBeenCalledWith(
      'b2b_cart_sync',
      expect.stringContaining('"source":"b2b"')
    );

    setItemSpy.mockRestore();
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useCartSync(mockCallback));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
