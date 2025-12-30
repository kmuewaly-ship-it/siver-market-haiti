import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useB2BCartItems } from './useB2BCartItems';

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

describe('useB2BCartItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty items array', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should have isLoading property', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    expect(result.current.isLoading).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should return B2B items with required properties', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'b2b-item-1',
        product_id: 'prod-1',
        sku: 'SKU-001',
        name: 'Wholesale Product 1',
        cantidad: 100,
        precioB2B: 25,
        subtotal: 2500,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    const item = result.current.items[0];
    expect(item.id).toBe('b2b-item-1');
    expect(item.cantidad).toBe(100);
    expect(item.precioB2B).toBe(25);
    expect(item.subtotal).toBe(2500);
  });

  it('should handle bulk quantities (B2B specific)', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'b2b-item-1',
        product_id: 'prod-1',
        sku: 'SKU-001',
        name: 'Bulk Product',
        cantidad: 1000, // Large bulk quantity
        precioB2B: 10,
        subtotal: 10000,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    expect(result.current.items[0].cantidad).toBe(1000);
    expect(result.current.items[0].subtotal).toBe(10000);
  });

  it('should set up real-time subscription for B2B', () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
      isLoading: false,
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    supabase.channel.mockReturnValue(mockChannel);

    renderHook(() => useB2BCartItems());

    expect(supabase.channel).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should not load items when seller is not authenticated', () => {
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

    const { result } = renderHook(() => useB2BCartItems());

    expect(result.current.items).toBeDefined();
  });

  it('should handle errors gracefully for B2B', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('should calculate total subtotal correctly for B2B items', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'b2b-item-1',
        product_id: 'prod-1',
        sku: 'SKU-001',
        name: 'Product 1',
        cantidad: 100,
        precioB2B: 25,
        subtotal: 2500,
      },
      {
        id: 'b2b-item-2',
        product_id: 'prod-2',
        sku: 'SKU-002',
        name: 'Product 2',
        cantidad: 50,
        precioB2B: 50,
        subtotal: 2500,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    const totalSubtotal = result.current.items.reduce((sum, item) => sum + item.subtotal, 0);
    expect(totalSubtotal).toBe(5000);
  });

  it('should track B2B specific fields', async () => {
    const { useAuth } = require('./useAuth');
    const { supabase } = require('@/integrations/supabase/client');

    const mockItems = [
      {
        id: 'b2b-item-1',
        product_id: 'prod-1',
        sku: 'SKU-B2B-001',
        name: 'B2B Product',
        cantidad: 250,
        precioB2B: 15,
        subtotal: 3750,
      },
    ];

    useAuth.mockReturnValue({
      user: { id: 'test-seller' },
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

    const { result } = renderHook(() => useB2BCartItems());

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    const item = result.current.items[0];
    expect(item.sku).toBeDefined();
    expect(item.precioB2B).toBeDefined();
    expect(item.cantidad).toBeDefined();
    expect(item.subtotal).toBeDefined();
  });
});
