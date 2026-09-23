import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Receipt, 
  Search, 
  Store, 
  Printer, 
  X, 
  Eye
} from 'lucide-react';
import { mockDb } from '@core/mock/mock-db';
import type { SaleReceipt } from '@modulos/punto-venta/tipos/pos.types';

export const SalesHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<SaleReceipt | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-all'],
    queryFn: () => mockDb.getAllSales(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => mockDb.getBranches(),
  });

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer?.businessName && s.customer.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.customer?.taxId && s.customer.taxId.includes(searchTerm));
    const matchesBranch = selectedBranch === 'ALL' || s.branchName.includes(selectedBranch);
    return matchesSearch && matchesBranch;
  });

  const printThermalTicket = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Historial y Auditoría de Ventas
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Consulta consolidada de facturación presencial, ventas POS y trazabilidad fiscal multi-sucursal.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por N° Factura, Cajero o NIT/CI del cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Sucursal:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todas las Sucursales</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando registros de venta...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No se encontraron ventas registradas con los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">N° Comprobante</th>
                  <th className="px-6 py-3.5">Sucursal</th>
                  <th className="px-6 py-3.5">Cajero</th>
                  <th className="px-6 py-3.5">Cliente (NIT/CI)</th>
                  <th className="px-6 py-3.5">Método</th>
                  <th className="px-6 py-3.5">Total</th>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.saleId} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sale.branchName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {sale.cashierName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="font-semibold text-gray-900">{sale.customer?.businessName || 'Sin Nombre'}</div>
                        <div className="text-gray-400 font-mono text-[11px]">NIT: {sale.customer?.taxId || '0'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-md text-xs font-semibold text-gray-700 border border-gray-200">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      Bs. {sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(sale.issuedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE RECIBO / TICKET TÉRMICO */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Simulación visual de Ticket Térmico */}
            <div className="font-mono text-xs border-dashed border-2 border-gray-300 p-4 bg-gray-50 rounded-lg text-gray-800">
              <div className="text-center mb-3">
                <h2 className="font-black text-sm tracking-wider text-gray-900">FASHIONSTORE RETAIL</h2>
                <p className="text-[10px] text-gray-500">{selectedReceipt.branchName}</p>
                <p className="text-[10px] text-gray-500">{selectedReceipt.branchAddress}</p>
                <div className="border-b border-dashed border-gray-400 my-2" />
                <p className="font-bold text-gray-900">{selectedReceipt.invoiceNumber}</p>
                <p className="text-[10px] text-gray-500">{new Date(selectedReceipt.issuedAt).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">Cajero: {selectedReceipt.cashierName}</p>
              </div>

              {selectedReceipt.customer?.businessName && (
                <div className="text-[10px] mb-2 border-b border-dashed border-gray-300 pb-2">
                  <p>Cliente: {selectedReceipt.customer.businessName}</p>
                  <p>NIT/CI: {selectedReceipt.customer.taxId}</p>
                </div>
              )}

              <div className="space-y-1 my-2">
                {selectedReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>{it.quantity}x {it.garmentName} ({it.sizeName})</span>
                    <span className="font-semibold">Bs. {it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Bs. {selectedReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (13%):</span>
                  <span>Bs. {selectedReceipt.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-1">
                  <span>TOTAL:</span>
                  <span>Bs. {selectedReceipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                  <span>Método: {selectedReceipt.paymentMethod}</span>
                  {selectedReceipt.amountTendered && (
                    <span>Cambio: Bs. {selectedReceipt.changeDue?.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={printThermalTicket}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
