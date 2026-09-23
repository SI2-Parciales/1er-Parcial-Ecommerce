import { create } from 'zustand';
import type { PosCartItem, CustomerBillingData, PaymentMethod, SaleReceipt } from '../tipos/pos.types';

interface PosState {
  cart: PosCartItem[];
  customer: CustomerBillingData;
  activeReservationId: string | null;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  lastCompletedSale: SaleReceipt | null;
  
  // Acciones de Carrito
  addItem: (item: Omit<PosCartItem, 'subtotal'>) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  
  // Acciones de Reserva y Cliente
  loadItemsFromReservation: (reservationId: string, items: Omit<PosCartItem, 'subtotal'>[]) => void;
  setCustomer: (customer: Partial<CustomerBillingData>) => void;
  resetCustomer: () => void;
  
  // Acciones de Cobro
  setPaymentMethod: (method: PaymentMethod) => void;
  setAmountTendered: (amount: number) => void;
  setLastCompletedSale: (sale: SaleReceipt | null) => void;
  resetSaleSession: () => void;
  
  // Cálculos de Totales
  getSubtotal: () => number;
  getTaxAmount: () => number; // IVA 13% sobre subtotal
  getTotalAmount: () => number;
  getChangeDue: () => number;
}

const DEFAULT_CUSTOMER: CustomerBillingData = {
  taxId: '0',
  businessName: 'Sin Nombre',
  email: '',
};

const round = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  customer: { ...DEFAULT_CUSTOMER },
  activeReservationId: null,
  paymentMethod: 'CASH',
  amountTendered: 0,
  lastCompletedSale: null,

  addItem: (newItem) => {
    set((state) => {
      const existingIndex = state.cart.findIndex((i) => i.variantId === newItem.variantId);
      
      if (existingIndex > -1) {
        const existing = state.cart[existingIndex];
        const newQty = Math.min(existing.quantity + newItem.quantity, existing.maxAvailableStock);
        const updatedItem: PosCartItem = {
          ...existing,
          quantity: newQty,
          subtotal: round(newQty * existing.unitPrice),
        };
        const newCart = [...state.cart];
        newCart[existingIndex] = updatedItem;
        return { cart: newCart };
      }

      const initialQty = Math.min(newItem.quantity, newItem.maxAvailableStock);
      const cartItem: PosCartItem = {
        ...newItem,
        quantity: initialQty > 0 ? initialQty : 1,
        subtotal: round((initialQty > 0 ? initialQty : 1) * newItem.unitPrice),
      };

      return { cart: [...state.cart, cartItem] };
    });
  },

  updateQuantity: (variantId, quantity) => {
    set((state) => {
      const updatedCart = state.cart.map((item) => {
        if (item.variantId === variantId) {
          const validQty = Math.max(1, Math.min(quantity, item.maxAvailableStock));
          return {
            ...item,
            quantity: validQty,
            subtotal: round(validQty * item.unitPrice),
          };
        }
        return item;
      });
      return { cart: updatedCart };
    });
  },

  removeItem: (variantId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.variantId !== variantId),
    }));
  },

  clearCart: () => {
    set({
      cart: [],
      activeReservationId: null,
      amountTendered: 0,
    });
  },

  loadItemsFromReservation: (reservationId, items) => {
    const preparedItems: PosCartItem[] = items.map((item) => ({
      ...item,
      isFromReservation: true,
      subtotal: round(item.quantity * item.unitPrice),
    }));

    set({
      cart: preparedItems,
      activeReservationId: reservationId,
      amountTendered: 0,
    });
  },

  setCustomer: (customerData) => {
    set((state) => ({
      customer: {
        ...state.customer,
        ...customerData,
      },
    }));
  },

  resetCustomer: () => {
    set({ customer: { ...DEFAULT_CUSTOMER } });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  setAmountTendered: (amount) => {
    set({ amountTendered: round(amount) });
  },

  setLastCompletedSale: (sale) => {
    set({ lastCompletedSale: sale });
  },

  resetSaleSession: () => {
    set({
      cart: [],
      customer: { ...DEFAULT_CUSTOMER },
      activeReservationId: null,
      paymentMethod: 'CASH',
      amountTendered: 0,
      lastCompletedSale: null,
    });
  },

  getSubtotal: () => {
    const { cart } = get();
    const sum = cart.reduce((acc, item) => acc + item.subtotal, 0);
    return round(sum);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    return round(subtotal * 0.13); // IVA 13% discriminado
  },

  getTotalAmount: () => {
    return get().getSubtotal();
  },

  getChangeDue: () => {
    const { amountTendered } = get();
    const total = get().getTotalAmount();
    if (amountTendered <= 0 || amountTendered < total) {
      return 0;
    }
    return round(amountTendered - total);
  },
}));
