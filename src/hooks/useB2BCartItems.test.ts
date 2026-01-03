import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useB2BCartItems } from './useB2BCartItems';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

// Mock useAuth
vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-seller' },
    isLoading: false,
  })),
}));

// Mock useCartSync
vi.mock('./useCartSync', () => ({
  useCartSync: vi.fn(() => ({
    broadcastCartUpdate: vi.fn(),
  })),
}));

describe('useB2BCartItems', () => {
  it('should initialize with empty items array', () => {
    const { result } = renderHook(() => useB2BCartItems());
    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should have isLoading property', () => {
    const { result } = renderHook(() => useB2BCartItems());
    expect(result.current.isLoading).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
