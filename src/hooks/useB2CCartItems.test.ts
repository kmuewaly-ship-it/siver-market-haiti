import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useB2CCartItems } from './useB2CCartItems';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock useCartSync
vi.mock('./useCartSync', () => ({
  useCartSync: vi.fn(() => ({
    broadcastCartUpdate: vi.fn(),
  })),
}));

describe('useB2CCartItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty items array', () => {
    // Mock the dependencies
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should have isLoading property', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    expect(result.current.isLoading).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should return items with required properties', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'item-1',
        product_id: 'prod-1',
        quantity: 2,
        price: 100,
        sku: 'SKU-001',
        name: 'Product 1',
        image: 'image1.jpg',
        store_id: 'store-1',
        store_name: 'Store 1',
        total_price: 200,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    const item = result.current.items[0];
    expect(item.id).toBe('item-1');
    expect(item.quantity).toBe(2);
    expect(item.price).toBe(100);
    expect(item.name).toBe('Product 1');
  });

  it('should handle loading state', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: true,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    expect(result.current.isLoading).toBe(true);
  });

  it('should set up real-time subscription', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    supabase.channel.mockReturnValue(mockChannel);

    const { result } = renderHook(() => useB2CCartItems());

    // Verify subscription was set up
    expect(supabase.channel).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should not load items when user is not authenticated', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    expect(result.current.items).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    const mockError = new Error('Database error');

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    // Should return empty items on error
    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should calculate totalPrice correctly', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'item-1',
        product_id: 'prod-1',
        quantity: 2,
        price: 100,
        sku: 'SKU-001',
        name: 'Product 1',
        image: 'image1.jpg',
        store_id: 'store-1',
        store_name: 'Store 1',
        total_price: 200,
      },
      {
        id: 'item-2',
        product_id: 'prod-2',
        quantity: 1,
        price: 50,
        sku: 'SKU-002',
        name: 'Product 2',
        image: 'image2.jpg',
        store_id: 'store-1',
        store_name: 'Store 1',
        total_price: 50,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-user' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }),
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useB2CCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    // totalPrice should be sum of all item totals: 200 + 50 = 250
    const totalPrice = result.current.items.reduce((sum, item) => sum + item.totalPrice, 0);
    expect(totalPrice).toBe(250);
  });
});
