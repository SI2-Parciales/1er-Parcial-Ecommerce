import type {
  CarritoEntity,
  CarritoItemEntity,
  OrdenEntity,
  OrdenItemEntity,
  PagoEntity,
} from '@/types/database.types';

export interface CartItem {
  id: string; // UUID carrito_items.id
  productId: string; // UUID productos.id
  variantId: string;
  name: string; // productos.nombre
  sizeName: string;
  colorName: string;
  colorHex: string;
  price: number; // carrito_items.precio_unitario
  quantity: number; // carrito_items.cantidad
  imageUrl: string;
}

export type DeliveryType = 'PICKUP_IN_STORE' | 'HOME_DELIVERY';

export interface ClientOrder {
  id: string; // UUID ordenes.id
  orderNumber: string; // referencia o código de orden
  items: CartItem[]; // orden_items
  subtotal: number; // ordenes.subtotal
  shippingCost: number;
  impuestos?: number; // ordenes.impuestos
  total: number; // ordenes.total
  deliveryType: DeliveryType;
  branchName?: string;
  usuario_id?: string; // ordenes.usuario_id
  direccion_id?: string; // ordenes.direccion_id
  paymentMethod: 'CARD_GATEWAY' | 'STATIC_QR'; // ordenes.metodo_pago
  paymentReceiptUrl?: string; // ordenes.referencia_pago
  status: 'PAID' | 'PENDING_MANUAL_VERIFICATION'; // ordenes.estado
  createdAt: string; // ordenes.creado_en
  pago?: PagoEntity; // tabla pagos
}

export type { CarritoEntity, CarritoItemEntity, OrdenEntity, OrdenItemEntity, PagoEntity };
