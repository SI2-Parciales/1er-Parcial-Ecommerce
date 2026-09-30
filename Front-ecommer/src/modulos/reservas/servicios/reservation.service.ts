/**
 * ============================================================================
 * SERVICIO OFICIAL DE RESERVAS - PANEL WEB (reservation.service.ts)
 * ============================================================================
 * Comunicación con el backend NestJS (/reservas) para el Encargado de Sucursal.
 * 
 * Casos de uso implementados:
 * - CU-E01: Consultar reservas de la sucursal (GET /reservas)
 * - CU-E02: Consultar detalle de reserva (GET /reservas/:id)
 * - CU-E03: Iniciar preparación (PATCH /reservas/:id/iniciar-preparacion)
 * - CU-E04: Finalizar atención (PATCH /reservas/:id/finalizar)
 * - Cancelación de reserva (DELETE /reservas/:id)
 */
import { apiClient } from '@core/http/api-client';
import type {
  FittingRoomReservation,
  UpdateReservationStatusPayload,
  ReservaEntidad,
  ReservationItem,
  ListReservasParams,
} from '../tipos/reservation.types';
import type { PaginatedResponse } from '@core/types/api.types';
import { mockDb } from '@core/mock/mock-db';

/**
 * Transforma una entidad de reserva devuelta por Prisma/NestJS
 * al formato unificado de la interfaz del encargado de tienda.
 */
export const mapearReservaEntidadAFittingRoom = (
  entidad: ReservaEntidad,
): FittingRoomReservation => {
  const items: ReservationItem[] = (entidad.detalles || []).map((det) => ({
    id: String(det.id),
    detalleId: det.id,
    variantId: String(det.varianteProducto.id),
    sku: det.varianteProducto.sku,
    barcode: `777000${det.varianteProducto.id}`,
    garmentName: det.varianteProducto.producto.nombre,
    sizeName: det.varianteProducto.talla.nombre,
    colorName: det.varianteProducto.color.nombre,
    price: Number(det.varianteProducto.producto.precio) || 0,
    imageUrl:
      det.varianteProducto.producto.imagenUrl ||
      'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&auto=format&fit=crop&q=80',
    quantity: det.cantidad,
  }));

  const reservationCode = `RES-${String(entidad.id).padStart(4, '0')}`;

  return {
    id: String(entidad.id),
    backendId: entidad.id,
    reservationCode,
    clientId: String(entidad.cliente.id),
    clientName: `${entidad.cliente.nombre} ${entidad.cliente.apellido}`.trim(),
    clientPhone: entidad.cliente.telefono || 'Sin teléfono registrado',
    clientEmail: entidad.cliente.email || '',
    branchId: String(entidad.sucursal.id),
    branchName: entidad.sucursal.nombre,
    scheduledTime: entidad.fechaHora,
    status: entidad.estado,
    items,
    rawDetalles: entidad.detalles,
    createdAt: entidad.creadoEn,
    updatedAt: entidad.actualizadoEn,
  };
};

export const reservationService = {
  /**
   * CU-E01: Consultar reservas de la sucursal
   * El backend NestJS filtra automáticamente según el rol del usuario autenticado:
   * - Si es ENCARGADO_SUCURSAL: sólo ve las de su sucursal.
   * - Si es ADMIN: puede ver todas o filtrar por sucursalId.
   */
  async getReservations(
    branchId?: string,
    date?: string,
    params?: ListReservasParams,
  ): Promise<PaginatedResponse<FittingRoomReservation>> {
    try {
      const queryParams: Record<string, any> = {
        limit: 100,
        ...params,
      };

      if (branchId) {
        const numBranch = parseInt(String(branchId).replace(/\D/g, ''), 10);
        if (!isNaN(numBranch) && numBranch > 0) {
          queryParams.sucursalId = numBranch;
        }
      }

      const response = await apiClient.get<any>('/reservas', {
        params: queryParams,
      });

      const dataArray = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      const mapped = dataArray.map((item: ReservaEntidad) =>
        mapearReservaEntidadAFittingRoom(item),
      );

      return {
        data: mapped,
        meta: response.data?.meta || {
          totalItems: mapped.length,
          itemCount: mapped.length,
          itemsPerPage: 100,
          totalPages: 1,
          currentPage: 1,
        },
      };
    } catch (err: any) {
      console.warn(
        'Aviso: No se pudo obtener reservas desde el backend, usando mockDb como contingencia:',
        err.message,
      );
      return mockDb.getReservations(branchId || '1', date);
    }
  },

  /**
   * CU-E02: Consultar detalle de reserva por ID numérico
   */
  async getReservationById(id: number | string): Promise<FittingRoomReservation> {
    const numId = parseInt(String(id).replace(/\D/g, ''), 10);
    try {
      const response = await apiClient.get<ReservaEntidad>(`/reservas/${numId}`);
      return mapearReservaEntidadAFittingRoom(response.data);
    } catch (err: any) {
      console.warn('Aviso: Fallo al consultar reserva por ID en backend:', err.message);
      const all = await mockDb.getReservations('1');
      const found = all.data.find((r) => r.id === String(id));
      if (found) return found;
      throw new Error(`Reserva ${id} no encontrada.`);
    }
  },

  /**
   * CU-E02: Consultar detalle de reserva por código (ej: "RES-0001" o "1")
   */
  async getReservationByCode(
    branchId: string,
    code: string,
  ): Promise<FittingRoomReservation> {
    const cleanCode = code.trim().toUpperCase();
    const numId = parseInt(cleanCode.replace(/\D/g, ''), 10);

    if (!isNaN(numId) && numId > 0) {
      try {
        return await this.getReservationById(numId);
      } catch {
        // Continuar búsqueda en listado o mockDb
      }
    }

    try {
      const listRes = await this.getReservations(branchId);
      const found = listRes.data.find(
        (r) =>
          r.reservationCode.toUpperCase() === cleanCode ||
          String(r.backendId) === String(numId) ||
          r.id === code,
      );
      if (found) return found;
    } catch {
      // Ignorar y caer a mockDb
    }

    return mockDb.getReservationByCode(branchId, cleanCode);
  },

  /**
   * CU-E03: Iniciar preparación de reserva
   * Pasa el estado de PENDIENTE a EN_PROCESO en la sucursal.
   */
  async iniciarPreparacion(id: number | string): Promise<FittingRoomReservation> {
    const numId = parseInt(String(id).replace(/\D/g, ''), 10);
    const response = await apiClient.patch<ReservaEntidad>(
      `/reservas/${numId}/iniciar-preparacion`,
    );
    return mapearReservaEntidadAFittingRoom(response.data);
  },

  /**
   * CU-E04: Finalizar atención de reserva
   * Pasa el estado de EN_PROCESO a FINALIZADA y libera el inventario retenido.
   */
  async finalizar(id: number | string): Promise<FittingRoomReservation> {
    const numId = parseInt(String(id).replace(/\D/g, ''), 10);
    const response = await apiClient.patch<ReservaEntidad>(
      `/reservas/${numId}/finalizar`,
    );
    return mapearReservaEntidadAFittingRoom(response.data);
  },

  /**
   * Cancelar reserva (por parte de la tienda o cliente)
   */
  async cancelarReserva(id: number | string): Promise<FittingRoomReservation> {
    const numId = parseInt(String(id).replace(/\D/g, ''), 10);
    try {
      const response = await apiClient.delete<ReservaEntidad>(
        `/reservas/${numId}`,
      );
      return mapearReservaEntidadAFittingRoom(response.data);
    } catch (err: any) {
      console.warn(
        'Aviso: Falló cancelación en backend, actualizando localmente:',
        err.message,
      );
      return mockDb.updateReservationStatus(String(id), {
        status: 'CANCELLED',
      });
    }
  },

  /**
   * Actualizar estado genérico (compatibilidad con componentes existentes)
   */
  async updateStatus(
    reservationId: string,
    payload: UpdateReservationStatusPayload,
  ): Promise<FittingRoomReservation> {
    const status = payload.status;

    if (status === 'PREPARING' || status === 'EN_PROCESO') {
      return this.iniciarPreparacion(reservationId);
    }

    if (status === 'COMPLETED' || status === 'FINALIZADA') {
      return this.finalizar(reservationId);
    }

    if (status === 'CANCELLED' || status === 'CANCELADA') {
      return this.cancelarReserva(reservationId);
    }

    // Para estados locales intermedios de UI (ej: READY, CLIENT_PRESENT)
    return mockDb.updateReservationStatus(reservationId, payload);
  },
};
