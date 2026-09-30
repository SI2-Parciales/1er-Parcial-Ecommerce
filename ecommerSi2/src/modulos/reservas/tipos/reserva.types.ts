/**
 * ============================================================================
 * TIPOS OFICIALES DE RESERVAS (Módulo de Reservas y Probador Inteligente)
 * ============================================================================
 * Alineados 100% con los modelos de Prisma y DTOs del Backend NestJS.
 */

export type EstadoReserva = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA' | 'CANCELADA';

export interface PrendaVarianteReserva {
  id: number;
  sku: string;
  producto: {
    id: number;
    nombre: string;
    imagenUrl: string | null;
  };
  talla: {
    id: number;
    nombre: string;
  };
  color: {
    id: number;
    nombre: string;
    codigoHex?: string;
  };
}

export interface PrendaReservaDetalle {
  id: number; // detalleId
  cantidad: number;
  varianteProducto: PrendaVarianteReserva;
}

export interface SucursalReserva {
  id: number;
  nombre: string;
  ubicacion: string;
}

export interface ClienteReserva {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
}

export interface ReservaEntidad {
  id: number;
  fechaHora: string;
  estado: EstadoReserva;
  creadoEn: string;
  actualizadoEn: string;
  sucursal: SucursalReserva;
  cliente: ClienteReserva;
  detalles?: PrendaReservaDetalle[];
}

export interface CrearReservaItemDto {
  varianteProductoId: number;
  cantidad: number;
}

export interface CrearReservaDto {
  sucursalId: number;
  fechaHora: string; // Formato ISO 8601
  items: CrearReservaItemDto[];
}

export interface ActualizarReservaDetalleDto {
  cantidad: number;
}

export interface ListarReservasQuery {
  page?: number;
  limit?: number;
  estado?: EstadoReserva;
  sucursalId?: number;
  clienteId?: number;
}

export interface RespuestaListaReservas {
  data: ReservaEntidad[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Representa una prenda dentro de la Bolsa de Probador Virtual (Fitting Bag)
 */
export interface FittingBagItem {
  id: string;
  detalleId?: number; // Identificador numérico del detalle en la BD para CU-R04
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  sizeName: string;
  colorName: string;
  colorHex: string;
  price: number;
  imageUrl: string;
  quantity?: number;
}

/**
 * Estructura de reserva unificada para la interfaz del cliente móvil
 */
export interface ClientReservation {
  id: string;
  reservationCode: string; // Ej: "RES-1234"
  backendId?: number;
  branchId: string;
  branchName: string;
  branchAddress: string;
  scheduledTime: string;
  status: EstadoReserva;
  items: FittingBagItem[];
  rawDetalles?: PrendaReservaDetalle[];
  createdAt: string;
  qrPayload: string;
}
