import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ReservaReciente {
  id: string;
  code: string;
  clientName: string;
  branchName: string;
  scheduledTime: string;
  status: string;
}

export interface PanelReservasRecientesProps {
  reservas: ReservaReciente[];
}

export const PanelReservasRecientes: React.FC<PanelReservasRecientesProps> = ({
  reservas,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-purple-600" />
            Reservas en Tienda
          </h3>
          <Link to="/reservations" className="text-xs text-blue-600 hover:underline font-semibold">
            Kanban
          </Link>
        </div>

        <div className="space-y-3">
          {reservas.map(res => (
            <div key={res.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between items-center">
                <strong className="font-mono font-bold text-gray-900">{res.code}</strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {res.status}
                </span>
              </div>
              <div className="text-gray-700 font-medium">{res.clientName}</div>
              <div className="text-gray-400 text-[11px]">{res.branchName} • Cita: {res.scheduledTime}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
