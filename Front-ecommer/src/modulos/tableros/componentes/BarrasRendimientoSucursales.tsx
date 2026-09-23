import React from 'react';
import { Store, ArrowRight, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RendimientoSucursal {
  branchId?: string;
  branchName: string;
  branchCode?: string;
  salesCount: number;
  totalRevenue: number;
  percentage?: number;
}

export interface BarrasRendimientoSucursalesProps {
  sucursales: RendimientoSucursal[];
}

export const BarrasRendimientoSucursales: React.FC<BarrasRendimientoSucursalesProps> = ({
  sucursales,
}) => {
  const maxRev = Math.max(...sucursales.map(b => b.totalRevenue), 1);
  const totalRev = sucursales.reduce((acc, b) => acc + b.totalRevenue, 0) || 1;
  const totalSales = sucursales.reduce((acc, b) => acc + b.salesCount, 0);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 1:
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 2:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getBarGradient = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700';
      case 1:
        return 'bg-gradient-to-r from-indigo-500 to-blue-500';
      case 2:
        return 'bg-gradient-to-r from-sky-500 to-teal-500';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Store className="w-4 h-4" />
              </span>
              Rendimiento de Ventas por Sucursal Física
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Desglose de facturación acumulada del día y participación por tienda
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalRev > 1 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                Bs. {totalRev.toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({totalSales} ventas)
              </span>
            )}
            <Link to="/branches" className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-semibold flex items-center gap-1 transition">
              Ver sucursales <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {sucursales.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-2 text-gray-300 opacity-60" />
            <p className="font-semibold text-gray-700 text-sm">Sin registros de ventas en sucursales hoy</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Las transacciones procesadas en las cajas físicas y terminales POS se computarán automáticamente en este panel.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sucursales.map((branch, index) => {
              const barPercentage = Math.max(Math.round((branch.totalRevenue / maxRev) * 100), 4);
              const sharePercentage = Math.round((branch.totalRevenue / totalRev) * 100);
              const avgTicket = branch.salesCount > 0 ? branch.totalRevenue / branch.salesCount : 0;

              return (
                <div 
                  key={branch.branchId || branch.branchName} 
                  className="p-3 rounded-xl hover:bg-gray-50/80 transition-all border border-transparent hover:border-gray-200 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${getRankBadge(index)}`}>
                        {index === 0 ? <Award className="w-3 h-3" /> : `#${index + 1}`}
                      </span>
                      <span className="font-bold text-gray-900">{branch.branchName}</span>
                      {branch.branchCode && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 font-mono text-[10px] rounded border border-gray-200">
                          {branch.branchCode}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        • {branch.salesCount} {branch.salesCount === 1 ? 'venta' : 'ventas'}
                        {avgTicket > 0 && ` (Ticket prom: Bs. ${avgTicket.toFixed(0)})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-900 font-black text-sm">
                        Bs. {branch.totalRevenue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {sharePercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${getBarGradient(index)}`}
                      style={{ width: `${barPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
        <span>Fuente: Cajas registradoras POS en tiempo real</span>
        <span className="font-semibold text-gray-600">Total multi-tienda: Bs. {totalRev.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

