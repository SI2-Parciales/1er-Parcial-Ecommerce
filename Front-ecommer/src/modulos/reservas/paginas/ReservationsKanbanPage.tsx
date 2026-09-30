/**
 * ============================================================================
 * TABLERO KANBAN DE PROBADOR FÍSICO (ReservationsKanbanPage.tsx)
 * ============================================================================
 * Panel de operaciones de tienda para el Encargado de Sucursal.
 * 
 * Casos de uso:
 * - CU-E01: Consultar reservas de la sucursal (en tiempo real y con filtros)
 * - CU-E02: Consultar detalle de reserva
 * - CU-E03: Iniciar preparación (PENDIENTE -> EN_PROCESO)
 * - CU-E04: Finalizar atención (EN_PROCESO -> FINALIZADA)
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { reservationService } from '../servicios/reservation.service';
import { useReservationStream } from '../ganchos/useReservationStream';
import { ReservationCard } from '../componentes/ReservationCard';
import { PickingSlipModal } from '../componentes/PickingSlipModal';
import type { FittingRoomReservation } from '../tipos/reservation.types';
import {
  Search,
  Volume2,
  VolumeX,
  Calendar,
  RefreshCw,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Store,
} from 'lucide-react';
import { format } from 'date-fns';

export function ReservationsKanbanPage() {
  const { user, activeBranchId } = useAuthStore();
  const currentBranchId = activeBranchId || user?.assignedBranchId || '1';

  const [search, setSearch] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [pickingReservation, setPickingReservation] = useState<FittingRoomReservation | null>(null);

  // Inicializar SSE Listener para notificaciones en vivo
  useReservationStream(currentBranchId, isSoundEnabled);

  // CU-E01: Consultar reservas de la sucursal con refresco automático
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['reservations', currentBranchId, date],
    queryFn: () => reservationService.getReservations(currentBranchId, date),
    refetchInterval: 15000, // Sincronización en segundo plano cada 15s
  });

  const allReservations = data?.data || [];

  // Filtrado predictivo por código, nombre o teléfono del cliente
  const filteredReservations = allReservations.filter((r) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      r.reservationCode.toLowerCase().includes(term) ||
      r.clientName.toLowerCase().includes(term) ||
      r.clientPhone.toLowerCase().includes(term)
    );
  });

  // Agrupación en las 4 columnas oficiales del ciclo de reservas
  const pending = filteredReservations.filter(
    (r) => r.status === 'PENDIENTE' || r.status === 'PENDING',
  );

  const preparing = filteredReservations.filter(
    (r) =>
      r.status === 'EN_PROCESO' ||
      r.status === 'PREPARING' ||
      r.status === 'READY' ||
      r.status === 'CLIENT_PRESENT',
  );

  const completed = filteredReservations.filter(
    (r) => r.status === 'FINALIZADA' || r.status === 'COMPLETED',
  );

  const cancelled = filteredReservations.filter(
    (r) => r.status === 'CANCELADA' || r.status === 'CANCELLED',
  );

  const handleOpenPicking = (res: FittingRoomReservation) => {
    setPickingReservation(res);
  };

  const KanbanColumn = ({
    title,
    subtitle,
    items,
    badgeColor,
    headerIcon: HeaderIcon,
  }: {
    title: string;
    subtitle: string;
    items: FittingRoomReservation[];
    badgeColor: string;
    headerIcon: any;
  }) => (
    <div className="flex flex-col bg-slate-100/70 rounded-2xl overflow-hidden h-full border border-gray-200/80 shadow-2xs">
      <div className="p-3.5 border-b border-gray-200 bg-white/90 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeaderIcon className="w-4 h-4 text-gray-500" />
          <div>
            <h3 className="font-extrabold text-sm text-gray-900">{title}</h3>
            <p className="text-[10px] text-gray-500 font-medium">{subtitle}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${badgeColor}`}
        >
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px]">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 italic py-10">
            Sin reservas en esta columna
          </div>
        ) : (
          items.map((res) => (
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
      {/* Encabezado y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-black text-gray-900">
              Probador Físico Pick & Try (Tablero Kanban)
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión de citas, recolección de prendas en bodega y atención en vestidor.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Silenciar/Activar Sonido */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
            title={isSoundEnabled ? 'Silenciar alertas sonoras' : 'Activar sonido de nuevas reservas'}
          >
            {isSoundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Botón Refrescar Manualmente */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200 disabled:opacity-50"
            title="Actualizar reservas ahora"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Selector de Fecha */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buscador Rápido */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 w-48 sm:w-60 focus:w-72 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Grid del Tablero con las 4 Columnas Oficiales */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm font-semibold">Cargando reservas de la sucursal...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            <KanbanColumn
              title="Pendientes"
              subtitle="Esperando recolección"
              items={pending}
              badgeColor="bg-amber-100 text-amber-800 border-amber-200"
              headerIcon={Clock}
            />

            <KanbanColumn
              title="En Preparación"
              subtitle="En bodega o vestidor"
              items={preparing}
              badgeColor="bg-blue-100 text-blue-800 border-blue-200"
              headerIcon={Package}
            />

            <KanbanColumn
              title="Atendidas"
              subtitle="Clientes atendidos"
              items={completed}
              badgeColor="bg-emerald-100 text-emerald-800 border-emerald-200"
              headerIcon={CheckCircle2}
            />

            <KanbanColumn
              title="Canceladas"
              subtitle="Stock liberado"
              items={cancelled}
              badgeColor="bg-red-100 text-red-800 border-red-200"
              headerIcon={XCircle}
            />
          </div>
        )}
      </div>

      {/* Modal de Picking List para Bodega (CU-E02) */}
      <PickingSlipModal
        isOpen={!!pickingReservation}
        onClose={() => setPickingReservation(null)}
        reservation={pickingReservation!}
      />
    </div>
  );
}
