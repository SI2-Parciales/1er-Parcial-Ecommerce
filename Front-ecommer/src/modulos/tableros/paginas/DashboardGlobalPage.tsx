import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  ShoppingBag, 
  CalendarClock, 
  AlertTriangle, 
  Sparkles, 
  Receipt 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockDb } from '@core/mock/mock-db';
import { TarjetaMetricaKpi } from '../componentes/TarjetaMetricaKpi';
import { BarrasRendimientoSucursales } from '../componentes/BarrasRendimientoSucursales';
import { PanelReservasRecientes } from '../componentes/PanelReservasRecientes';
import { TablaVentasRecientes } from '../componentes/TablaVentasRecientes';

export const DashboardGlobalPage: React.FC = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis-global'],
    queryFn: () => mockDb.getDashboardKpis(),
  });

  if (isLoading || !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome - Estética Blanca Prémium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 text-gray-900 shadow-xs">
        <div>
          <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-100">
            FashionStore Retail Core • Administrador
          </span>
          <h1 className="text-2xl font-black text-gray-900">
            Dashboard Ejecutivo Global
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
            Supervisión integral de ventas multi-sucursal, demanda de probadores inteligentes e inventario global en tiempo real.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/ai-assistant"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            Reporte IA en Vivo
          </Link>
          <Link
            to="/sales-history"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition border border-gray-200"
          >
            <Receipt className="w-4 h-4" />
            Auditoría Ventas
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards Componentizadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <TarjetaMetricaKpi
          titulo="Ingresos del Día"
          valor={`Bs. ${kpis.todayRevenue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          tendencia="+14.8% vs. día anterior"
          icono={TrendingUp}
          colorIcono="text-emerald-600"
          bgIcono="bg-emerald-50"
        />
        <TarjetaMetricaKpi
          titulo="Transacciones POS"
          valor={kpis.todaySalesCount}
          subtitulo="Ventas procesadas hoy"
          icono={ShoppingBag}
          colorIcono="text-blue-600"
          bgIcono="bg-blue-50"
        />
        <TarjetaMetricaKpi
          titulo="Reservas Probador"
          valor={kpis.activeReservationsCount}
          subtitulo="En preparación / Tienda activa"
          icono={CalendarClock}
          colorIcono="text-indigo-600"
          bgIcono="bg-indigo-50"
        />
        <TarjetaMetricaKpi
          titulo="Alertas de Reposición"
          valor={kpis.lowStockItemsCount}
          subtitulo="Prendas bajo umbral mínimo"
          icono={AlertTriangle}
          colorIcono="text-amber-600"
          bgIcono="bg-amber-50"
          colorValor="text-amber-600"
        />
      </div>

      {/* Main Grid: Ventas por Sucursal + Últimas Reservas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BarrasRendimientoSucursales sucursales={kpis.salesByBranch} />
        <PanelReservasRecientes reservas={kpis.recentReservations} />
      </div>

      {/* Recientes Comprobantes de Venta */}
      <TablaVentasRecientes ventas={kpis.recentSales} />
    </div>
  );
};
