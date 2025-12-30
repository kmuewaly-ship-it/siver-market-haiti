import { describe, it, expect } from 'vitest';
import {
  validateB2CCheckout,
  validateB2BCheckout,
  getFieldError,
  hasFieldError,
} from './checkoutValidation';

describe('checkoutValidation', () => {
  describe('validateB2CCheckout', () => {
    it('should return error if items array is empty', () => {
      const errors = validateB2CCheckout({
        items: [],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('items');
      expect(errors[0].message).toBe('Tu carrito está vacío');
    });

    it('should return error if delivery method is not selected', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: null,
        deliveryMethod: null as any,
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'deliveryMethod')).toBe(true);
    });

    it('should return error if address delivery selected but no address provided', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: null,
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'selectedAddress')).toBe(true);
    });

    it('should return error if pickup delivery selected but no pickup point provided', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: null,
        deliveryMethod: 'pickup',
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'selectedPickupPoint')).toBe(true);
    });

    it('should return error if payment method is not selected', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: null as any,
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'paymentMethod')).toBe(true);
    });

    it('should return error if MonCash selected but no payment reference provided', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'moncash',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'paymentReference')).toBe(true);
    });

    it('should return error if Transfer selected but no payment reference provided', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'transfer',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'paymentReference')).toBe(true);
    });

    it('should not require payment reference if Stripe selected', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors.some(e => e.field === 'paymentReference')).toBe(false);
    });

    it('should pass validation with all required fields for address delivery', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 2 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'stripe',
        paymentReference: '',
      });

      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all required fields for pickup delivery', () => {
      const errors = validateB2CCheckout({
        items: [{ id: 'prod-1', quantity: 1 }],
        selectedAddress: null,
        deliveryMethod: 'pickup',
        selectedPickupPoint: 'pickup-1',
        paymentMethod: 'moncash',
        paymentReference: 'REF123',
      });

      expect(errors).toHaveLength(0);
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const errors = validateB2CCheckout({
        items: [],
        selectedAddress: null,
        deliveryMethod: null as any,
        selectedPickupPoint: null,
        paymentMethod: null as any,
        paymentReference: '',
      });

      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateB2BCheckout', () => {
    it('should validate B2B checkout with same rules as B2C', () => {
      const errors = validateB2BCheckout({
        items: [],
        selectedAddress: null,
        deliveryMethod: null as any,
        selectedPickupPoint: null,
        paymentMethod: null as any,
        paymentReference: '',
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass B2B validation with all required fields', () => {
      const errors = validateB2BCheckout({
        items: [{ id: 'prod-1', quantity: 100 }],
        selectedAddress: 'addr-1',
        deliveryMethod: 'address',
        selectedPickupPoint: null,
        paymentMethod: 'transfer',
        paymentReference: 'TRF456',
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe('getFieldError', () => {
    it('should return error message for a specific field', () => {
      const errors = [
        { field: 'items', message: 'Tu carrito está vacío' },
        { field: 'paymentMethod', message: 'Selecciona un método de pago' },
      ];

      const itemsError = getFieldError(errors, 'items');
      expect(itemsError).toBe('Tu carrito está vacío');

      const paymentError = getFieldError(errors, 'paymentMethod');
      expect(paymentError).toBe('Selecciona un método de pago');
    });

    it('should return empty string if field error not found', () => {
      const errors = [{ field: 'items', message: 'Tu carrito está vacío' }];

      const notFoundError = getFieldError(errors, 'paymentMethod');
      expect(notFoundError).toBe('');
    });

    it('should return empty string if errors array is empty', () => {
      const error = getFieldError([], 'items');
      expect(error).toBe('');
    });
  });

  describe('hasFieldError', () => {
    it('should return true if field has error', () => {
      const errors = [
        { field: 'items', message: 'Tu carrito está vacío' },
      ];

      expect(hasFieldError(errors, 'items')).toBe(true);
    });

    it('should return false if field does not have error', () => {
      const errors = [
        { field: 'items', message: 'Tu carrito está vacío' },
      ];

      expect(hasFieldError(errors, 'paymentMethod')).toBe(false);
    });

    it('should return false if errors array is empty', () => {
      expect(hasFieldError([], 'items')).toBe(false);
    });
  });
});
