import type { FittingRoomReservation, ReservationStatus } from '../tipos/reservation.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationService } from '../servicios/reservation.service';
import { Clock, User, Phone, CheckCircle, Package, ArrowRight, XCircle } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  reservation: FittingRoomReservation;
  onOpenPicking?: (reservation: FittingRoomReservation) => void;
}

export function ReservationCard({ reservation, onOpenPicking }: Props) {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: ({ status }: { status: ReservationStatus }) => 
      reservationService.updateStatus(reservation.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', reservation.branchId] });
    }
  });

  const handleStatusChange = (status: ReservationStatus) => {
    mutation.mutate({ status });
  };

  const scheduleDate = new Date(reservation.scheduledTime);
  const isDelayed = isPast(scheduleDate) && reservation.status !== 'COMPLETED' && reservation.status !== 'CANCELLED' && reservation.status !== 'EXPIRED';
  const timeRel = formatDistanceToNow(scheduleDate, { addSuffix: true, locale: es });

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
      <div className={cn(
        "p-3 border-b flex justify-between items-center",
        isDelayed ? "bg-red-50 border-red-200" : "bg-gray-50/80 border-gray-200"
      )}>
        <span className="font-mono font-bold text-sm text-gray-900">{reservation.reservationCode}</span>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock className={cn("w-3.5 h-3.5", isDelayed ? "text-red-500" : "text-gray-400")} />
          <span className={isDelayed ? "text-red-600 font-bold" : "text-gray-600"}>
            {format(scheduleDate, 'HH:mm')} ({timeRel})
          </span>
        </div>
      </div>

      <div className="p-3.5 space-y-3 flex-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900 truncate">{reservation.clientName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{reservation.clientPhone}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">{reservation.items.length} prendas solicitadas:</p>
          <div className="flex flex-wrap gap-2">
            {reservation.items.map(item => (
              <div key={item.id} className="relative group w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-help" title={`${item.garmentName} - ${item.sizeName} / ${item.colorName}`}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.garmentName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2.5 border-t border-gray-100 bg-gray-50/80 flex flex-wrap gap-2">
        {reservation.status === 'PENDING' && (
          <button
            onClick={() => handleStatusChange('PREPARING')}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" /> Preparar
          </button>
        )}
        
        {reservation.status === 'PREPARING' && (
          <>
            {onOpenPicking && (
              <button
                onClick={() => onOpenPicking(reservation)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Lista Picking
              </button>
            )}
            <button
              onClick={() => handleStatusChange('READY')}
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Listo
            </button>
          </>
        )}

        {reservation.status === 'READY' && (
          <button
            onClick={() => handleStatusChange('CLIENT_PRESENT')}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Cliente Llegó
          </button>
        )}

        {reservation.status === 'CLIENT_PRESENT' && (
          <div className="w-full text-center py-1.5 text-xs font-bold text-gray-500">
            Esperando paso por POS
          </div>
        )}

        {(reservation.status === 'PENDING' || reservation.status === 'PREPARING') && (
          <button
            onClick={() => handleStatusChange('CANCELLED')}
            disabled={mutation.isPending}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Cancelar Reserva"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
