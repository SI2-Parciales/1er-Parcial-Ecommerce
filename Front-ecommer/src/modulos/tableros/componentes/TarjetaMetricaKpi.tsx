import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

export interface TarjetaMetricaKpiProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  tendencia?: string;
  icono: LucideIcon;
  colorIcono?: string;
  bgIcono?: string;
  colorValor?: string;
}

export const TarjetaMetricaKpi: React.FC<TarjetaMetricaKpiProps> = ({
  titulo,
  valor,
  subtitulo,
  tendencia,
  icono: Icono,
  colorIcono = 'text-blue-600',
  bgIcono = 'bg-blue-50',
  colorValor = 'text-gray-900',
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs transition hover:shadow-sm">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-gray-500">{titulo}</span>
        <div className={`p-2 rounded-lg ${bgIcono} ${colorIcono}`}>
          <Icono className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className={`text-2xl font-black ${colorValor}`}>{valor}</h3>
        {tendencia && (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {tendencia}
          </span>
        )}
        {subtitulo && (
          <span className="text-xs text-gray-500 font-medium block mt-1">
            {subtitulo}
          </span>
        )}
      </div>
    </div>
  );
};
