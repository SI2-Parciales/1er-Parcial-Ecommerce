import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Store, 
  CalendarClock, 
  Package, 
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { mockDb } from '@core/mock/mock-db';
import { inventoryService } from '@modulos/inventario/servicios/inventory.service';

export const BranchDashboardPage: React.FC = () => {
  const { activeBranchId, user } = useAuthStore();
  const branchId = activeBranchId || user?.assignedBranchId || 'branch-1';
  const branchName = user?.assignedBranchName || 'Sucursal Central';

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['branch-kpis', branchId],
    queryFn: () => mockDb.getDashboardKpis(branchId),
  });

  const { data: reservations = { data: [] } } = useQuery({
    queryKey: ['branch-reservations', branchId],
    queryFn: () => mockDb.getReservations(branchId),
  });

  const { data: branchStock = { data: [] } } = useQuery({
    queryKey: ['branch-inventory-stats', branchId],
    queryFn: () => inventoryService.getStock(branchId, {}),
  });

  if (isLoading || !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lowStockItems = branchStock.data.filter(s => s.availableStock <= s.minAlertThreshold);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                Dashboard de Sucursal
              </h1>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                {branchName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Panel operativo para el Encargado de Tienda: flujo de caja, probadores y control de stock local.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/reservations"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <CalendarClock className="w-4 h-4" /> Kanban Reservas
          </Link>
          <Link
            to="/inventory"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold border border-gray-200"
          >
            <Package className="w-4 h-4" /> Existencias
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Ventas Sucursal Hoy</span>
          <h3 className="text-2xl font-black text-gray-900 mt-2">
            Bs. {kpis.todayRevenue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </h3>
          <span className="text-xs text-emerald-600 font-semibold block mt-1">
            Meta diaria en 85%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Tickets de Caja</span>
          <h3 className="text-2xl font-black text-gray-900 mt-2">
            {kpis.todaySalesCount}
          </h3>
          <span className="text-xs text-gray-500 font-medium block mt-1">
            Transacciones completadas
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Reservas Probador Hoy</span>
          <h3 className="text-2xl font-black text-purple-600 mt-2">
            {reservations.data.length}
          </h3>
          <span className="text-xs text-gray-500 font-medium block mt-1">
            Pick & Try agendados
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Alertas de Stock Local</span>
          <h3 className="text-2xl font-black text-amber-600 mt-2">
            {lowStockItems.length}
          </h3>
          <span className="text-xs text-gray-500 font-medium block mt-1">
            Prendas a solicitar traslado
          </span>
        </div>
      </div>

      {/* Grid: Reservas del día + Prendas con bajo stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas de probador */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-600" />
              Turnos de Probador en Sucursal
            </h3>
            <Link to="/reservations" className="text-xs text-blue-600 hover:underline font-semibold">
              Ir al Kanban
            </Link>
          </div>

          <div className="space-y-2.5">
            {reservations.data.slice(0, 4).map(r => (
              <div key={r.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <strong className="font-mono font-bold text-gray-900">{r.reservationCode}</strong>
                  <div className="text-gray-700 font-medium">{r.clientName} ({r.items.length} prendas)</div>
                  <div className="text-gray-400 text-[11px]">Horario: {r.scheduledTime}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reposición / Alertas de Stock */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Prendas Críticas para Traslado
            </h3>
            <Link to="/inventory" className="text-xs text-blue-600 hover:underline font-semibold">
              Gestionar Stock
            </Link>
          </div>

          <div className="space-y-2.5">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay alertas de existencias en esta sucursal.</p>
            ) : (
              lowStockItems.slice(0, 4).map(item => (
                <div key={item.id} className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-gray-900 font-bold">{item.garmentName}</strong>
                    <div className="text-gray-500 font-mono text-[11px]">{item.sku} • {item.sizeName} / {item.colorName}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-600">{item.availableStock} disp.</span>
                    <div className="text-[10px] text-gray-400">Mín: {item.minAlertThreshold}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
