/**
 * ============================================================================
 * ALMACÉN DE BOLSA DE PROBADOR Y CITAS PICK & TRY (useFittingBagStore)
 * ============================================================================
 * Gestiona tanto las prendas apartadas para el vestidor físico (máximo 5)
 * como las reservas sincronizadas con el Backend NestJS (POST /reservas, GET /reservas).
 */
import { create } from 'zustand';
import { appStorage } from '@shared/storage/mmkv';
import { reservasService, ErrorReservaApi } from '../servicios/reservas.service';
import type {
  FittingBagItem,
  ClientReservation,
  ReservaEntidad,
  CrearReservaDto,
  EstadoReserva,
} from '../tipos/reserva.types';

export const mapearReservaEntidadACliente = (entidad: ReservaEntidad): ClientReservation => {
  const items: FittingBagItem[] = (entidad.detalles || []).map((det) => ({
    id: `det-${det.id}`,
    detalleId: det.id,
    productId: String(det.varianteProducto.producto.id),
    productName: det.varianteProducto.producto.nombre,
    variantId: String(det.varianteProducto.id),
    sku: det.varianteProducto.sku,
    sizeName: det.varianteProducto.talla.nombre,
    colorName: det.varianteProducto.color.nombre,
    colorHex: det.varianteProducto.color.codigoHex || '#333333',
    price: 0,
    imageUrl:
      det.varianteProducto.producto.imagenUrl ||
      'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&auto=format&fit=crop&q=80',
    quantity: det.cantidad,
  }));

  const fechaObj = new Date(entidad.fechaHora);
  const fechaStr = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : entidad.fechaHora;

  const reservationCode = `RES-${String(entidad.id).padStart(4, '0')}`;

  return {
    id: String(entidad.id),
    backendId: entidad.id,
    reservationCode,
    branchId: String(entidad.sucursal.id),
    branchName: entidad.sucursal.nombre,
    branchAddress: entidad.sucursal.ubicacion,
    scheduledTime: fechaStr,
    status: entidad.estado,
    items,
    rawDetalles: entidad.detalles,
    createdAt: entidad.creadoEn,
    qrPayload: JSON.stringify({
      id: entidad.id,
      codigo: reservationCode,
      sucursal: entidad.sucursal.nombre,
      fechaHora: entidad.fechaHora,
      cliente: `${entidad.cliente.nombre} ${entidad.cliente.apellido}`,
      prendas: items.length,
    }),
  };
};

interface FittingBagState {
  items: FittingBagItem[];
  selectedDate: string;
  selectedTimeSlot: string;
  reservations: ClientReservation[];
  isLoading: boolean;
  errorMessage: string | null;

  // Manejo de la bolsa de probador (Pick & Try)
  addItem: (item: FittingBagItem) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  clearBag: () => void;
  setTimeSlot: (date: string, slot: string) => void;

  // CU-R01: Confirmar reserva en el Backend
  confirmarReservaServidor: (
    branchId: number | string,
    branchName: string,
    branchAddress: string,
    fechaHoraIso: string,
  ) => Promise<{ success: boolean; reservation?: ClientReservation; message?: string; suggestion?: string }>;

  // CU-R02: Consultar mis reservas del Backend
  cargarReservasBackend: () => Promise<void>;

  // CU-R04: Modificar reserva en el Backend
  reducirCantidadPrendaServidor: (
    reservaId: number,
    detalleId: number,
    nuevaCantidad: number,
  ) => Promise<{ success: boolean; reservation?: ClientReservation; message?: string }>;

  quitarPrendaReservaServidor: (
    reservaId: number,
    detalleId: number,
  ) => Promise<{ success: boolean; reservation?: ClientReservation; message?: string }>;

  // CU-R05: Cancelar reserva en el Backend
  cancelarReservaServidor: (
    id: string | number,
  ) => Promise<{ success: boolean; message?: string; suggestion?: string }>;

  // Métodos de compatibilidad local
  confirmReservation: (branchId: string, branchName: string, branchAddress: string) => ClientReservation;
  cancelReservation: (id: string) => void;
}

export const useFittingBagStore = create<FittingBagState>((set, get) => {
  const savedItems = appStorage.getObject<FittingBagItem[]>('fitting_bag_items') || [];
  const savedReservations = appStorage.getObject<ClientReservation[]>('client_reservations') || [];

  return {
    items: savedItems,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedTimeSlot: '15:30 - 16:00',
    reservations: savedReservations,
    isLoading: false,
    errorMessage: null,

    addItem: (item) => {
      const current = get().items;
      if (current.length >= 5) {
        return {
          success: false,
          message: 'Límite de probador alcanzado (máximo 5 prendas por turno)',
        };
      }
      const updated = [...current, item];
      appStorage.setObject('fitting_bag_items', updated);
      set({ items: updated });
      return { success: true };
    },

    removeItem: (id) => {
      const updated = get().items.filter((it) => it.id !== id);
      appStorage.setObject('fitting_bag_items', updated);
      set({ items: updated });
    },

    clearBag: () => {
      appStorage.setObject('fitting_bag_items', []);
      set({ items: [] });
    },

    setTimeSlot: (selectedDate, selectedTimeSlot) => {
      set({ selectedDate, selectedTimeSlot });
    },

    /**
     * CU-R01: Confirmar reserva en el Servidor (POST /reservas)
     */
    confirmarReservaServidor: async (branchId, branchName, branchAddress, fechaHoraIso) => {
      const currentItems = get().items;
      if (currentItems.length === 0) {
        return {
          success: false,
          message: 'La bolsa de probador está vacía. Añade al menos una prenda.',
        };
      }

      set({ isLoading: true, errorMessage: null });

      const sucursalIdNum = typeof branchId === 'number' ? branchId : parseInt(String(branchId).replace(/\D/g, ''), 10) || 1;

      // Transformar prendas a CreateReservaDetalleDto
      const itemsPayload = currentItems.map((it) => {
        const numericVariant = parseInt(String(it.variantId).replace(/\D/g, ''), 10) || 1;
        return {
          varianteProductoId: numericVariant,
          cantidad: it.quantity || 1,
        };
      });

      const dto: CrearReservaDto = {
        sucursalId: sucursalIdNum,
        fechaHora: fechaHoraIso,
        items: itemsPayload,
      };

      try {
        const resBackend = await reservasService.crearReserva(dto);
        const mappedReservation = mapearReservaEntidadACliente(resBackend);

        const updatedReservations = [mappedReservation, ...get().reservations.filter((r) => r.id !== mappedReservation.id)];
        appStorage.setObject('client_reservations', updatedReservations);
        appStorage.setObject('fitting_bag_items', []);

        set({
          reservations: updatedReservations,
          items: [],
          isLoading: false,
        });

        return {
          success: true,
          reservation: mappedReservation,
        };
      } catch (err: any) {
        console.warn('Fallo al crear reserva en backend, usando guardado local contingente:', err.message);

        // Fallback local en caso de que el backend no responda o no haya token
        const localReservation = get().confirmReservation(String(branchId), branchName, branchAddress);
        set({ isLoading: false });

        if (err instanceof ErrorReservaApi) {
          return {
            success: true,
            reservation: localReservation,
            message: err.message,
            suggestion: err.suggestion,
          };
        }

        return {
          success: true,
          reservation: localReservation,
          message: 'Reserva guardada localmente.',
        };
      }
    },

    /**
     * CU-R02: Consultar mis reservas del Backend (GET /reservas)
     */
    cargarReservasBackend: async () => {
      set({ isLoading: true, errorMessage: null });
      try {
        const respuesta = await reservasService.obtenerMisReservas({ limit: 50 });
        if (respuesta && Array.isArray(respuesta.data)) {
          const mapped = respuesta.data.map(mapearReservaEntidadACliente);
          appStorage.setObject('client_reservations', mapped);
          set({ reservations: mapped, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (err: any) {
        console.warn('Error al cargar reservas del backend, manteniendo locales:', err.message);
        set({ isLoading: false, errorMessage: err.message });
      }
    },

    /**
     * CU-R04: Reducir cantidad de una prenda reservada
     */
    reducirCantidadPrendaServidor: async (reservaId, detalleId, nuevaCantidad) => {
      set({ isLoading: true, errorMessage: null });
      try {
        const resBackend = await reservasService.reducirCantidadPrenda(reservaId, detalleId, nuevaCantidad);
        const mapped = mapearReservaEntidadACliente(resBackend);

        const updated = get().reservations.map((r) => (r.backendId === reservaId || r.id === String(reservaId) ? mapped : r));
        appStorage.setObject('client_reservations', updated);
        set({ reservations: updated, isLoading: false });

        return { success: true, reservation: mapped };
      } catch (err: any) {
        set({ isLoading: false });
        return { success: false, message: err.message };
      }
    },

    /**
     * CU-R04: Quitar una prenda de la reserva
     */
    quitarPrendaReservaServidor: async (reservaId, detalleId) => {
      set({ isLoading: true, errorMessage: null });
      try {
        const resBackend = await reservasService.quitarPrendaReserva(reservaId, detalleId);
        const mapped = mapearReservaEntidadACliente(resBackend);

        const updated = get().reservations.map((r) => (r.backendId === reservaId || r.id === String(reservaId) ? mapped : r));
        appStorage.setObject('client_reservations', updated);
        set({ reservations: updated, isLoading: false });

        return { success: true, reservation: mapped };
      } catch (err: any) {
        set({ isLoading: false });
        return { success: false, message: err.message };
      }
    },

    /**
     * CU-R05: Cancelar reserva en el Backend (DELETE /reservas/:id)
     */
    cancelarReservaServidor: async (id) => {
      set({ isLoading: true });
      const numericId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10);

      try {
        if (!isNaN(numericId) && numericId > 0) {
          const cancelada = await reservasService.cancelarReserva(numericId);
          const mapped = mapearReservaEntidadACliente(cancelada);

          const updated = get().reservations.map((r) =>
            r.backendId === numericId || r.id === String(id) ? mapped : r,
          );
          appStorage.setObject('client_reservations', updated);
          set({ reservations: updated, isLoading: false });

          return { success: true };
        } else {
          // Cancelación local
          get().cancelReservation(String(id));
          set({ isLoading: false });
          return { success: true };
        }
      } catch (err: any) {
        set({ isLoading: false });
        // Si falló en backend pero es válido cancelar localmente:
        get().cancelReservation(String(id));
        return {
          success: false,
          message: err.message || 'No se pudo cancelar la reserva en el servidor.',
          suggestion: err.suggestion,
        };
      }
    },

    confirmReservation: (branchId, branchName, branchAddress) => {
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const code = `RES-${codeNum}`;
      const newReservation: ClientReservation = {
        id: `res-${Date.now()}`,
        reservationCode: code,
        branchId,
        branchName,
        branchAddress,
        scheduledTime: `${get().selectedDate} ${get().selectedTimeSlot}`,
        status: 'PENDIENTE',
        items: [...get().items],
        createdAt: new Date().toISOString(),
        qrPayload: JSON.stringify({
          code,
          branchId,
          itemsCount: get().items.length,
          time: `${get().selectedDate} ${get().selectedTimeSlot}`,
        }),
      };

      const updatedReservations = [newReservation, ...get().reservations];
      appStorage.setObject('client_reservations', updatedReservations);
      appStorage.setObject('fitting_bag_items', []);

      set({
        reservations: updatedReservations,
        items: [],
      });

      return newReservation;
    },

    cancelReservation: (id) => {
      const updated = get().reservations.map((r) =>
        r.id === id ? { ...r, status: 'CANCELADA' as const } : r,
      );
      appStorage.setObject('client_reservations', updated);
      set({ reservations: updated });
    },
  };
});
