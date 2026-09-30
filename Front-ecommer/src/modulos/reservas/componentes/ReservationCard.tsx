/**
 * ============================================================================
 * COMPONENTE: TARJETA DE RESERVA (ReservationCard.tsx)
 * ============================================================================
 * Tarjeta interactiva del Tablero Kanban para el Encargado de Sucursal.
 * 
 * Casos de uso:
 * - CU-E02: Consultar detalle básico de la reserva
 * - CU-E03: Iniciar preparación (PENDIENTE -> EN_PROCESO)
 * - CU-E04: Finalizar atención (EN_PROCESO -> FINALIZADA)
 * - Cancelar reserva si el cliente desiste
 */
import type { FittingRoomReservation } from '../tipos/reservation.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationService } from '../servicios/reservation.service';
import {
  Clock,
  User,
  Phone,
  CheckCircle,
  Package,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  reservation: FittingRoomReservation;
  onOpenPicking?: (reservation: FittingRoomReservation) => void;
}

export function ReservationCard({ reservation, onOpenPicking }: Props) {
  const queryClient = useQueryClient();

  const isPendiente =
    reservation.status === 'PENDIENTE' || reservation.status === 'PENDING';
  const isEnProceso =
    reservation.status === 'EN_PROCESO' ||
    reservation.status === 'PREPARING' ||
    reservation.status === 'READY' ||
    reservation.status === 'CLIENT_PRESENT';
  const isFinalizada =
    reservation.status === 'FINALIZADA' || reservation.status === 'COMPLETED';
  const isCancelada =
    reservation.status === 'CANCELADA' || reservation.status === 'CANCELLED';

  // CU-E03: Mutación para Iniciar Preparación
  const preparacionMutation = useMutation({
    mutationFn: () => reservationService.iniciarPreparacion(reservation.backendId || reservation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  // CU-E04: Mutación para Finalizar Atención
  const finalizarMutation = useMutation({
    mutationFn: () => reservationService.finalizar(reservation.backendId || reservation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  // Mutación para Cancelar Reserva
  const cancelarMutation = useMutation({
    mutationFn: () => reservationService.cancelarReserva(reservation.backendId || reservation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const isLoading =
    preparacionMutation.isPending ||
    finalizarMutation.isPending ||
    cancelarMutation.isPending;

  const scheduleDate = new Date(reservation.scheduledTime);
  const isValidDate = !isNaN(scheduleDate.getTime());
  const isDelayed =
    isValidDate &&
    isPast(scheduleDate) &&
    !isFinalizada &&
    !isCancelada;

  const timeRel = isValidDate
    ? formatDistanceToNow(scheduleDate, { addSuffix: true, locale: es })
    : '';

  const timeDisplay = isValidDate
    ? format(scheduleDate, 'HH:mm')
    : reservation.scheduledTime;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col hover:border-gray-300 transition-all">
      {/* Cabecera de la Tarjeta */}
      <div
        className={cn(
          'p-3 border-b flex justify-between items-center',
          isDelayed ? 'bg-red-50 border-red-200' : 'bg-gray-50/80 border-gray-200',
        )}
      >
        <span className="font-mono font-bold text-sm text-gray-900">
          {reservation.reservationCode}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock
            className={cn('w-3.5 h-3.5', isDelayed ? 'text-red-500' : 'text-gray-400')}
          />
          <span className={isDelayed ? 'text-red-600 font-bold' : 'text-gray-600'}>
            {timeDisplay} {timeRel ? `(${timeRel})` : ''}
          </span>
        </div>
      </div>

      {/* Contenido: Cliente y Prendas */}
      <div className="p-3.5 space-y-3 flex-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-900 truncate">
              {reservation.clientName || 'Cliente sin nombre'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{reservation.clientPhone}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {reservation.items.length}{' '}
            {reservation.items.length === 1 ? 'prenda solicitada' : 'prendas solicitadas'}:
          </p>
          <div className="flex flex-wrap gap-2">
            {reservation.items.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="relative group w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-help"
                title={`${item.garmentName} - Talla: ${item.sizeName} | Color: ${item.colorName} (Cant: ${item.quantity || 1})`}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.garmentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 font-bold">
                    PRENDA
                  </div>
                )}
                {(item.quantity || 1) > 1 && (
                  <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-tl">
                    {item.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones de la Tarjeta */}
      <div className="p-2.5 border-t border-gray-100 bg-gray-50/80 flex flex-wrap gap-2 items-center">
        {/* CU-E03: Botón Iniciar Preparación */}
        {isPendiente && (
          <button
            onClick={() => preparacionMutation.mutate()}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" /> Iniciar Preparación
          </button>
        )}

        {/* CU-E04: Botón Finalizar Atención */}
        {isEnProceso && (
          <button
            onClick={() => finalizarMutation.mutate()}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Finalizar Atención
          </button>
        )}

        {/* Botón Lista de Picking para Bodega */}
        {onOpenPicking && (isPendiente || isEnProceso) && (
          <button
            onClick={() => onOpenPicking(reservation)}
            className="py-1.5 px-2.5 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Ver prendas para recolección en bodega"
          >
            <ClipboardList className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Botón Cancelar Reserva */}
        {(isPendiente || isEnProceso) && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  `¿Confirmas la cancelación de la reserva ${reservation.reservationCode}?`,
                )
              ) {
                cancelarMutation.mutate();
              }
            }}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Cancelar Reserva"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}

        {/* Badges de Estados Terminales */}
        {isFinalizada && (
          <div className="w-full text-center py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Atendida con éxito
          </div>
        )}

        {isCancelada && (
          <div className="w-full text-center py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Reserva Cancelada
          </div>
        )}
      </div>
    </div>
  );
}
