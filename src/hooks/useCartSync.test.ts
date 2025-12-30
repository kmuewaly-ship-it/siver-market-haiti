import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCartSync } from './useCartSync';

describe('useCartSync', () => {
  let mockCallback: () => void;

  beforeEach(() => {
    mockCallback = vi.fn() as () => void;
    // Clear localStorage before each test
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

  it('should call callback when storage event is triggered with b2c_cart_sync key', async () => {
    renderHook(() => useCartSync(mockCallback));

    // Simulate storage event from another tab
    const event = new StorageEvent('storage', {
      key: 'b2c_cart_sync',
      newValue: JSON.stringify({ timestamp: Date.now(), source: 'b2c' }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('should call callback when storage event is triggered with b2b_cart_sync key', async () => {
    renderHook(() => useCartSync(mockCallback));

    const event = new StorageEvent('storage', {
      key: 'b2b_cart_sync',
      newValue: JSON.stringify({ timestamp: Date.now(), source: 'b2b' }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('should call callback when storage event is triggered with cart_update key', async () => {
    renderHook(() => useCartSync(mockCallback));

    const event = new StorageEvent('storage', {
      key: 'cart_update',
      newValue: JSON.stringify({ timestamp: Date.now() }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('should not call callback for unrelated storage events', async () => {
    renderHook(() => useCartSync(mockCallback));

    const event = new StorageEvent('storage', {
      key: 'some_other_key',
      newValue: 'some_value',
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    }, { timeout: 500 });
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

  it('should include timestamp in broadcast message', () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const beforeBroadcast = Date.now();

    result.current.broadcastCartUpdate('b2c');

    const calls = setItemSpy.mock.calls;
    const broadcastCall = calls.find(call => call[0] === 'b2c_cart_sync');
    expect(broadcastCall).toBeDefined();

    if (broadcastCall) {
      const data = JSON.parse(broadcastCall[1] as string);
      expect(data.timestamp).toBeGreaterThanOrEqual(beforeBroadcast);
      expect(data.timestamp).toBeLessThanOrEqual(Date.now());
    }

    setItemSpy.mockRestore();
  });

  it('should remove localStorage key after broadcast', async () => {
    const { result } = renderHook(() => useCartSync(mockCallback));
    
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    result.current.broadcastCartUpdate('b2c');

    // Wait for the timeout that removes the key
    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith('b2c_cart_sync');
    }, { timeout: 200 });

    removeItemSpy.mockRestore();
  });

  it('should call callback only once per storage event', async () => {
    renderHook(() => useCartSync(mockCallback));

    const event = new StorageEvent('storage', {
      key: 'b2c_cart_sync',
      newValue: JSON.stringify({ timestamp: Date.now() }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle rapid successive broadcasts', async () => {
    const { result } = renderHook(() => useCartSync(mockCallback));

    const event1 = new StorageEvent('storage', {
      key: 'b2c_cart_sync',
      newValue: JSON.stringify({ timestamp: Date.now() }),
    });

    const event2 = new StorageEvent('storage', {
      key: 'b2b_cart_sync',
      newValue: JSON.stringify({ timestamp: Date.now() }),
    });

    window.dispatchEvent(event1);
    window.dispatchEvent(event2);

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });
});
