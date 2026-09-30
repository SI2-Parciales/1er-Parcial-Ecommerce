/**
 * ============================================================================
 * SERVICIO OFICIAL DE RESERVAS (reservas.service.ts)
 * ============================================================================
 * Comunicación directa entre la aplicación móvil y el backend NestJS (/reservas).
 * 
 * Casos de Uso del Cliente:
 * - CU-R01: Crear reserva (POST /reservas)
 * - CU-R02: Consultar mis reservas (GET /reservas)
 * - CU-R03: Consultar detalle de reserva (GET /reservas/:id)
 * - CU-R04: Modificar reserva:
 *           - Reducir cantidad (PATCH /reservas/:id/detalles/:detalleId)
 *           - Quitar prenda (DELETE /reservas/:id/detalles/:detalleId)
 * - CU-R05: Cancelar reserva (DELETE /reservas/:id)
 * ============================================================================
 */
import { apiClient } from '@shared/api/apiClient';
import { ENDPOINTS } from '@shared/api/endpoints';
import type {
  CrearReservaDto,
  ReservaEntidad,
  RespuestaListaReservas,
  ListarReservasQuery,
  ActualizarReservaDetalleDto,
} from '../tipos/reserva.types';

export class ErrorReservaApi extends Error {
  constructor(
    public override message: string,
    public suggestion?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ErrorReservaApi';
  }
}

const extraerMensajeError = (err: any): { message: string; suggestion?: string; status?: number } => {
  const status = err.response?.status;
  const data = err.response?.data;
  const msgBackend = data?.message || err.message;

  if (status === 401) {
    return {
      message: 'Sesión no iniciada o expirada.',
      suggestion: 'Inicia sesión con tu cuenta para poder gestionar tus reservas.',
      status,
    };
  }

  if (status === 403) {
    return {
      message: 'No tienes permisos para realizar esta operación sobre la reserva.',
      suggestion: 'Verifica estar usando la cuenta con la que realizaste la reserva.',
      status,
    };
  }

  if (status === 404) {
    return {
      message: typeof msgBackend === 'string' ? msgBackend : 'La reserva o prenda no fue encontrada.',
      suggestion: 'Verifica que la prenda o la reserva sigan vigentes.',
      status,
    };
  }

  if (status === 409) {
    return {
      message: typeof msgBackend === 'string' ? msgBackend : 'Conflicto de disponibilidad o estado.',
      suggestion: 'Es posible que el stock se haya agotado o la reserva ya no esté pendiente.',
      status,
    };
  }

  if (status === 400) {
    const detail = Array.isArray(msgBackend) ? msgBackend.join(', ') : msgBackend;
    return {
      message: detail || 'Datos de reserva incompletos o incorrectos.',
      suggestion: 'Revisa la sucursal seleccionada, el horario y las prendas.',
      status,
    };
  }

  return {
    message: typeof msgBackend === 'string' ? msgBackend : 'No se pudo conectar con el servidor de reservas.',
    suggestion: 'Comprueba tu conexión a internet o intenta nuevamente en unos momentos.',
    status: status || 500,
  };
};

export const reservasService = {
  /**
   * CU-R01: Crear reserva
   * Registra una nueva reserva de prendas con apartado de stock en la sucursal.
   */
  async crearReserva(datos: CrearReservaDto): Promise<ReservaEntidad> {
    try {
      const response = await apiClient.post<ReservaEntidad>(
        ENDPOINTS.RESERVAS.BASE,
        datos,
      );
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },

  /**
   * CU-R02: Consultar mis reservas
   * Obtiene la lista de reservas asociadas al cliente autenticado.
   */
  async obtenerMisReservas(query?: ListarReservasQuery): Promise<RespuestaListaReservas> {
    try {
      const params = new URLSearchParams();
      if (query?.page) params.append('page', String(query.page));
      if (query?.limit) params.append('limit', String(query.limit));
      if (query?.estado) params.append('estado', query.estado);
      if (query?.sucursalId) params.append('sucursalId', String(query.sucursalId));

      const url = `${ENDPOINTS.RESERVAS.BASE}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<RespuestaListaReservas>(url);
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },

  /**
   * CU-R03: Consultar detalle de reserva
   * Obtiene la información completa de una reserva: prendas, tallas, colores y sucursal.
   */
  async obtenerDetalleReserva(id: number): Promise<ReservaEntidad> {
    try {
      const response = await apiClient.get<ReservaEntidad>(
        ENDPOINTS.RESERVAS.BY_ID(id),
      );
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },

  /**
   * CU-R04: Reducir cantidad de una prenda reservada
   * Permite reducir la cantidad reservada de una prenda, liberando stock.
   */
  async reducirCantidadPrenda(
    reservaId: number,
    detalleId: number,
    nuevaCantidad: number,
  ): Promise<ReservaEntidad> {
    try {
      const payload: ActualizarReservaDetalleDto = { cantidad: nuevaCantidad };
      const response = await apiClient.patch<ReservaEntidad>(
        ENDPOINTS.RESERVAS.UPDATE_DETAIL(reservaId, detalleId),
        payload,
      );
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },

  /**
   * CU-R04: Quitar una prenda de la reserva
   * Elimina completamente la prenda de la reserva y libera el inventario.
   */
  async quitarPrendaReserva(
    reservaId: number,
    detalleId: number,
  ): Promise<ReservaEntidad> {
    try {
      const response = await apiClient.delete<ReservaEntidad>(
        ENDPOINTS.RESERVAS.REMOVE_DETAIL(reservaId, detalleId),
      );
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },

  /**
   * CU-R05: Cancelar reserva
   * Cancela una reserva en estado PENDIENTE y libera todo el inventario retenido.
   */
  async cancelarReserva(id: number): Promise<ReservaEntidad> {
    try {
      const response = await apiClient.delete<ReservaEntidad>(
        ENDPOINTS.RESERVAS.CANCEL(id),
      );
      return response.data;
    } catch (err: any) {
      const errorInfo = extraerMensajeError(err);
      throw new ErrorReservaApi(errorInfo.message, errorInfo.suggestion, errorInfo.status);
    }
  },
};
