import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { reservationService } from '../servicios/reservation.service';
import { useReservationStream } from '../ganchos/useReservationStream';
import { ReservationCard } from '../componentes/ReservationCard';
import { PickingSlipModal } from '../componentes/PickingSlipModal';
import type { FittingRoomReservation } from '../tipos/reservation.types';
import { Search, Volume2, VolumeX, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function ReservationsKanbanPage() {
  const { user, activeBranchId } = useAuthStore();
  const currentBranchId = activeBranchId || user?.assignedBranchId || 'branch-1';
  
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  const [pickingReservation, setPickingReservation] = useState<FittingRoomReservation | null>(null);

  // Inicializar SSE Listener
  useReservationStream(currentBranchId, isSoundEnabled);

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', currentBranchId, date],
    queryFn: () => reservationService.getReservations(currentBranchId, date),
    refetchInterval: 60000, // Poll fallback cada 60s
  });

  const allReservations = data?.data || [];
  
  const filteredReservations = allReservations.filter(r => 
    r.reservationCode.toLowerCase().includes(search.toLowerCase()) || 
    r.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const pending = filteredReservations.filter(r => r.status === 'PENDING');
  const preparing = filteredReservations.filter(r => r.status === 'PREPARING');
  const ready = filteredReservations.filter(r => r.status === 'READY');
  const clientPresent = filteredReservations.filter(r => r.status === 'CLIENT_PRESENT');

  const handleOpenPicking = (res: FittingRoomReservation) => {
    setPickingReservation(res);
  };

  const KanbanColumn = ({ title, items }: { title: string, items: FittingRoomReservation[] }) => (
    <div className="flex flex-col bg-slate-100/70 rounded-xl overflow-hidden h-full border border-gray-200 shadow-2xs">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-bold text-sm text-gray-900">{title}</h3>
        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-700 border border-gray-200 shadow-2xs">
          {items.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
            Sin reservas
          </div>
        ) : (
          items.map(res => (
            <ReservationCard 
              key={res.id} 
              reservation={res} 
              onOpenPicking={handleOpenPicking}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Probador Físico (Kanban)</h1>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
            title={isSoundEnabled ? "Silenciar notificaciones" : "Activar sonido"}
          >
            {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Código o Cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Cargando tablero...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            <KanbanColumn title="Pendientes" items={pending} />
            <KanbanColumn title="En Preparación" items={preparing} />
            <KanbanColumn title="Listas en Probador" items={ready} />
            <KanbanColumn title="Cliente en Tienda" items={clientPresent} />
          </div>
        )}
      </div>

      <PickingSlipModal 
        isOpen={!!pickingReservation} 
        onClose={() => setPickingReservation(null)}
        reservation={pickingReservation!}
      />
    </div>
  );
}
