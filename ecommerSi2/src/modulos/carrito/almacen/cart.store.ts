import { create } from 'zustand';
import { appStorage } from '@shared/storage/mmkv';
import type { CartItem, DeliveryType, ClientOrder } from '../tipos/cart.types';

interface CartState {
  items: CartItem[];
  deliveryType: DeliveryType;
  orders: ClientOrder[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setDeliveryType: (type: DeliveryType) => void;
  getSubtotal: () => number;
  getShippingCost: () => number;
  getTotal: () => number;
  createOrder: (paymentMethod: 'CARD_GATEWAY' | 'STATIC_QR', branchName?: string, receiptUrl?: string) => ClientOrder;
}

const INITIAL_ORDERS: ClientOrder[] = [
  {
    id: 'ord-init-1',
    orderNumber: 'ORD-549120',
    items: [
      {
        id: 'cart-init-1',
        productId: 'prod-2',
        variantId: 'var-2-1',
        name: 'Blazer Entallado Mujer',
        sizeName: 'M',
        colorName: 'Azul Marino',
        colorHex: '#1E3A8A',
        price: 119.5,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'cart-init-2',
        productId: 'prod-3',
        variantId: 'var-3-2',
        name: 'Blusa Satinada Elegante',
        sizeName: 'M',
        colorName: 'Blanco Seda',
        colorHex: '#FFFFFF',
        price: 48.0,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&auto=format&fit=crop&q=80',
      },
    ],
    subtotal: 164.5,
    shippingCost: 0,
    total: 164.5,
    deliveryType: 'PICKUP_IN_STORE',
    branchName: 'Sucursal Central',
    paymentMethod: 'CARD_GATEWAY',
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const useCartStore = create<CartState>((set, get) => {
  const savedItems = appStorage.getObject<CartItem[]>('cart_items') || [];
  const savedOrders = appStorage.getObject<ClientOrder[]>('client_orders');
  const initialOrders = savedOrders && savedOrders.length > 0 ? savedOrders : INITIAL_ORDERS;

  return {
    items: savedItems,
    deliveryType: 'PICKUP_IN_STORE',
    orders: initialOrders,

    addItem: (newItem) => {
      const current = get().items;
      const existingIdx = current.findIndex(it => it.variantId === newItem.variantId);
      let updated: CartItem[];

      if (existingIdx > -1) {
        updated = [...current];
        updated[existingIdx].quantity += newItem.quantity;
      } else {
        updated = [...current, { ...newItem, id: `cart-item-${Date.now()}` }];
      }

      appStorage.setObject('cart_items', updated);
      set({ items: updated });
    },

    updateQuantity: (variantId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(variantId);
        return;
      }
      const updated = get().items.map(it => it.variantId === variantId ? { ...it, quantity } : it);
      appStorage.setObject('cart_items', updated);
      set({ items: updated });
    },

    removeItem: (variantId) => {
      const updated = get().items.filter(it => it.variantId !== variantId);
      appStorage.setObject('cart_items', updated);
      set({ items: updated });
    },

    clearCart: () => {
      appStorage.setObject('cart_items', []);
      set({ items: [] });
    },

    setDeliveryType: (deliveryType) => set({ deliveryType }),

    getSubtotal: () => {
      return Math.round(get().items.reduce((acc, it) => acc + it.price * it.quantity, 0) * 100) / 100;
    },

    getShippingCost: () => {
      return get().deliveryType === 'HOME_DELIVERY' ? 20.00 : 0.00;
    },

    getTotal: () => {
      return Math.round((get().getSubtotal() + get().getShippingCost()) * 100) / 100;
    },

    createOrder: (paymentMethod, branchName, receiptUrl) => {
      const subtotal = get().getSubtotal();
      const shippingCost = get().getShippingCost();
      const total = get().getTotal();
      const orderNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderId = `ord-${Date.now()}`;
      const newOrder: ClientOrder = {
        id: orderId,
        orderNumber: orderNum,
        items: [...get().items],
        subtotal,
        shippingCost,
        impuestos: 0,
        total,
        deliveryType: get().deliveryType,
        branchName: branchName || 'Sucursal Central',
        usuario_id: 'user-4',
        direccion_id: 'dir-2',
        paymentMethod,
        paymentReceiptUrl: receiptUrl,
        status: paymentMethod === 'CARD_GATEWAY' ? 'PAID' : 'PENDING_MANUAL_VERIFICATION',
        createdAt: new Date().toISOString(),
        pago: {
          id: `pago-${Date.now()}`,
          orden_id: orderId,
          proveedor: paymentMethod === 'CARD_GATEWAY' ? 'CYBERSOURCE' : 'QR_SIMPLE',
          monto: total,
          estado: paymentMethod === 'CARD_GATEWAY' ? 'EXITOSO' : 'PENDIENTE',
          referencia: orderNum,
          metadata: { branchName, receiptUrl: receiptUrl || null },
          creado_en: new Date().toISOString(),
        },
      };

      const updatedOrders = [newOrder, ...get().orders];
      appStorage.setObject('client_orders', updatedOrders);
      appStorage.setObject('cart_items', []);
      set({ orders: updatedOrders, items: [] });

      return newOrder;
    },
  };
});
