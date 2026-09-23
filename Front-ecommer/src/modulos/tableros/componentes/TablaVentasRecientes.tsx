import React from 'react';
import { Receipt, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface VentaReciente {
  id: string;
  invoiceNumber: string;
  branchName: string;
  cashierName: string;
  paymentMethod: string;
  totalAmount: number;
  issuedAt: string;
}

export interface TablaVentasRecientesProps {
  ventas: VentaReciente[];
}

export const TablaVentasRecientes: React.FC<TablaVentasRecientesProps> = ({
  ventas,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Últimos Comprobantes de Venta Emitidos
          </h3>
          <p className="text-xs text-gray-500">Transacciones registradas por los cajeros</p>
        </div>
        <Link to="/sales-history" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
          Ver todas las ventas <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5">Factura / Ticket</th>
              <th className="px-4 py-2.5">Sucursal</th>
              <th className="px-4 py-2.5">Cajero</th>
              <th className="px-4 py-2.5">Método de Pago</th>
              <th className="px-4 py-2.5">Monto Total</th>
              <th className="px-4 py-2.5">Fecha y Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300 opacity-60" />
                  <p className="font-semibold text-gray-600">No hay ventas registradas recientemente</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Los comprobantes emitidos en el Punto de Venta (POS) aparecerán aquí en tiempo real.</p>
                </td>
              </tr>
            ) : (
              ventas.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50/70 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{sale.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{sale.branchName}</td>
                  <td className="px-4 py-3 text-gray-700">{sale.cashierName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700 border border-gray-200">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">Bs. {sale.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(sale.issuedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
