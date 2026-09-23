import { apiClient } from '@shared/api/apiClient';
import { ENDPOINTS } from '@shared/api/endpoints';

export interface BackendCarritoDetalle {
  id: number;
  varianteProductoId: number;
  cantidad: number;
  varianteProducto: {
    id: number;
    sku: string;
    precio: number;
    talla: { id: number; nombre: string };
    color: { id: number; nombre: string; codigoHex?: string };
    producto: {
      id: number;
      nombre: string;
      categoria?: { id: number; nombre: string };
      imagenes?: Array<{ id: number; url: string; esPrincipal: boolean }>;
    };
  };
}

export interface BackendCarrito {
  id: number;
  usuarioId: number;
  sucursalId?: number;
  detalles: BackendCarritoDetalle[];
  total: number;
}

export interface BackendVentaDigital {
  id: number;
  canal: 'DIGITAL';
  sucursalId: number;
  clienteId: number;
  nombreFacturacion: string;
  documentoFacturacion: string;
  total: number;
  estado: 'PENDIENTE_PAGO' | 'PAGADA';
  claveIdempotencia?: string;
  fecha: string;
}

export interface BackendPagoResponse {
  id: number;
  ventaId: number;
  metodo: 'TARJETA' | 'QR';
  monto: number;
  estado: 'CONFIRMADO';
  simulado: boolean;
  fecha: string;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const cartService = {
  /**
   * Obtiene o crea el carrito activo del cliente en el backend
   */
  async getCart(): Promise<BackendCarrito | null> {
    try {
      const response = await apiClient.get<BackendCarrito>(ENDPOINTS.CART.BASE);
      return response.data;
    } catch (err: any) {
      console.warn('Backend /carrito no disponible o sin sesión activa:', err.message);
      return null;
    }
  },

  /**
   * Selecciona la sucursal de retiro/inventario para el carrito
   */
  async selectBranch(sucursalId: number): Promise<BackendCarrito | null> {
    try {
      const response = await apiClient.put<BackendCarrito>(ENDPOINTS.CART.BRANCH, { sucursalId });
      return response.data;
    } catch (err: any) {
      console.warn('Error al seleccionar sucursal en /carrito/sucursal:', err.message);
      return null;
    }
  },

  /**
   * Agrega un artículo al carrito del backend con validación de inventario
   */
  async addDetail(varianteProductoId: number, cantidad: number): Promise<BackendCarrito | null> {
    try {
      const response = await apiClient.post<BackendCarrito>(ENDPOINTS.CART.DETAILS, {
        varianteProductoId,
        cantidad,
      });
      return response.data;
    } catch (err: any) {
      console.warn('Error al agregar detalle en /carrito/detalles:', err.message);
      throw err;
    }
  },

  /**
   * Actualiza la cantidad de un artículo en el carrito
   */
  async updateDetail(detalleId: number, cantidad: number): Promise<BackendCarrito | null> {
    try {
      const response = await apiClient.patch<BackendCarrito>(ENDPOINTS.CART.DETAIL_BY_ID(detalleId), {
        cantidad,
      });
      return response.data;
    } catch (err: any) {
      console.warn(`Error al actualizar detalle ${detalleId}:`, err.message);
      throw err;
    }
  },

  /**
   * Elimina un artículo del carrito
   */
  async removeDetail(detalleId: number): Promise<BackendCarrito | null> {
    try {
      const response = await apiClient.delete<BackendCarrito>(ENDPOINTS.CART.DETAIL_BY_ID(detalleId));
      return response.data;
    } catch (err: any) {
      console.warn(`Error al eliminar detalle ${detalleId}:`, err.message);
      throw err;
    }
  },

  /**
   * Crea la venta digital pendiente de pago (CU12)
   */
  async createDigitalSale(
    nombreFacturacion: string,
    documentoFacturacion: string,
    idempotencyKey = generateUUID()
  ): Promise<BackendVentaDigital> {
    const response = await apiClient.post<BackendVentaDigital>(
      ENDPOINTS.VENTAS.DIGITALES,
      {
        nombreFacturacion: nombreFacturacion.trim(),
        documentoFacturacion: documentoFacturacion.trim(),
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data;
  },

  /**
   * Confirma el pago electrónico simulado para la venta digital (CU36)
   */
  async processElectronicPayment(
    ventaId: number,
    metodo: 'TARJETA' | 'QR'
  ): Promise<BackendPagoResponse> {
    const response = await apiClient.post<BackendPagoResponse>(
      ENDPOINTS.PAYMENTS.ELECTRONIC(ventaId),
      { metodo }
    );
    return response.data;
  },
};
