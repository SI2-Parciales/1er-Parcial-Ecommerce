import { useState, useMemo } from 'react';
import { Table as TableIcon, ChevronLeft, ChevronRight, Search, Printer, FileSpreadsheet } from 'lucide-react';
import type { ReportColumnDef } from '../tipos/ai.types';

interface AiDataTableProps {
  data?: Array<Record<string, string | number>>;
  columnsDef?: ReportColumnDef[];
  totals?: Record<string, string | number>;
  reportTitle?: string;
  reportCode?: string;
}

export function AiDataTable({
  data,
  columnsDef,
  totals,
  reportTitle = 'Reporte Ejecutivo Analítico',
  reportCode = 'INF-2026',
}: AiDataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  if (!data || data.length === 0) {
    return null;
  }

  // Columnas efectivas
  const columns: Array<{ key: string; header: string; type: string; align: 'left' | 'center' | 'right' }> = useMemo(() => {
    if (columnsDef && columnsDef.length > 0) {
      return columnsDef.map((c) => ({
        key: c.key,
        header: c.header || c.key.toUpperCase(),
        type: c.type || inferColumnType(c.key),
        align: c.align || inferColumnAlign(c.key),
      }));
    }

    const firstRowKeys = Object.keys(data[0] || {});
    return firstRowKeys.map((key) => ({
      key,
      header: formatHeader(key),
      type: inferColumnType(key),
      align: inferColumnAlign(key),
    }));
  }, [columnsDef, data]);

  // Filtrado de búsqueda en vivo
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Exportar a CSV formal
  const handleExportCsv = () => {
    if (filteredData.length === 0) return;

    const headers = columns.map((col) => `"${col.header}"`).join(',');
    const rows = filteredData.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key] !== undefined ? String(row[col.key]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    // Si hay fila de totales, incluirla en el CSV
    let totalsRow = '';
    if (totals && Object.keys(totals).length > 0) {
      totalsRow = '\r\n' + columns.map((col) => `"${totals[col.key] || ''}"`).join(',');
    }

    const csvContent = [headers, ...rows].join('\r\n') + totalsRow;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportCode}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full my-5 bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden print:border-none print:shadow-none">
      {/* Barra de Controles y Acciones Ejecutivas */}
      <div className="p-4 border-b border-gray-200 bg-linear-to-r from-gray-50 via-white to-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
              <span>{reportTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                {reportCode}
              </span>
            </h4>
            <p className="text-[11px] text-gray-500">
              {filteredData.length} registros auditados {searchTerm && `(filtrados por "${searchTerm}")`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Buscador dentro de la tabla */}
          <div className="relative min-w-[170px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en tabla..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Exportar a archivo Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          {/* Imprimir / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-gray-600" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Contenedor de la Tabla Ejecutiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 whitespace-nowrap ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-gray-400 italic">
                  No se encontraron coincidencias para los criterios indicados.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-blue-50/40 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 whitespace-nowrap text-xs ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {renderTableCell(row[col.key], col.type, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Fila de Totales Generales Ejecutivos */}
          {totals && Object.keys(totals).length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                {columns.map((col) => {
                  const val = totals[col.key];
                  return (
                    <td
                      key={`total-${col.key}`}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right text-emerald-900 font-mono font-bold'
                          : 'text-left'
                      }`}
                    >
                      {val !== undefined ? String(val) : ''}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginador y Conteo */}
      <div className="p-3 border-t border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>Mostrar:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value={5}>5 filas</option>
            <option value={10}>10 filas</option>
            <option value={20}>20 filas</option>
            <option value={50}>50 filas</option>
          </select>
          <span className="text-gray-400">|</span>
          <span>
            Mostrando {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)} -{' '}
            {Math.min(filteredData.length, currentPage * pageSize)} de {filteredData.length} registros
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-semibold text-xs text-gray-800 bg-white border border-gray-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// HELPERS DE RENDERIZADO VISUAL
// ==========================================
function renderTableCell(value: any, type: string, key: string) {
  if (value === undefined || value === null || value === '') return <span className="text-gray-300">-</span>;

  const str = String(value).trim();

  // Formato de Moneda Boliviana
  if (type === 'currency' || key.toLowerCase().includes('precio') || key.toLowerCase().includes('subtotal') || key.toLowerCase().includes('total') || key.toLowerCase().includes('monto')) {
    if (typeof value === 'number') {
      return <span className="font-mono font-bold text-emerald-700">Bs. {value.toFixed(2)}</span>;
    }
    if (str.startsWith('Bs.') || str.includes('Bs')) {
      return <span className="font-mono font-bold text-emerald-700">{str}</span>;
    }
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) {
      return <span className="font-mono font-bold text-emerald-700">Bs. {parsed.toFixed(2)}</span>;
    }
  }

  // Badges de Estado Operativo
  const upper = str.toUpperCase();
  if (upper === 'CRÍTICO' || upper === 'CRITICO' || upper === 'BAJA CONVERSIÓN' || upper === 'MERMA' || upper === 'AGOTADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {str}
      </span>
    );
  }

  if (upper === 'ÓPTIMO' || upper === 'OPTIMO' || upper === 'PAGADA' || upper === 'CONCILIADO' || upper === 'ACTIVO' || upper === 'ALTA CONVERSIÓN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {str}
      </span>
    );
  }

  if (upper === 'PENDIENTE' || upper === 'EN PREPARACIÓN' || upper === 'ARQUEADO' || upper === 'TRANSFERENCIA') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {str}
      </span>
    );
  }

  // Badge de Tallas
  if (key.toLowerCase() === 'talla' && (upper === 'XS' || upper === 'S' || upper === 'M' || upper === 'L' || upper === 'XL' || upper === 'XXL')) {
    return (
      <span className="inline-block px-2 py-0.5 font-bold text-[10px] rounded-md bg-slate-100 text-slate-800 border border-slate-300 font-mono">
        {str}
      </span>
    );
  }

  // Métodos de Pago
  if (key.toLowerCase().includes('metodo') || key.toLowerCase().includes('pago')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 font-medium text-[11px] rounded-md bg-blue-50 text-blue-800 border border-blue-200">
        {str}
      </span>
    );
  }

  // Números simples
  if (type === 'number' || typeof value === 'number') {
    return <span className="font-mono font-semibold text-gray-800">{value}</span>;
  }

  // Fechas
  if (type === 'date' || key.toLowerCase().includes('fecha')) {
    return <span className="text-gray-600 font-mono text-[11px]">{str}</span>;
  }

  // Texto estándar
  return <span className="text-gray-900 font-medium">{str}</span>;
}

function inferColumnType(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('precio') || k.includes('subtotal') || k.includes('total') || k.includes('monto')) return 'currency';
  if (k.includes('cantidad') || k.includes('cant') || k.includes('disponible') || k.includes('reservado') || k.includes('transacciones') || k.includes('probadas') || k.includes('compradas')) return 'number';
  if (k.includes('fecha')) return 'date';
  if (k.includes('estado') || k.includes('talla') || k.includes('metodo') || k.includes('tipo')) return 'badge';
  return 'text';
}

function inferColumnAlign(key: string): 'left' | 'center' | 'right' {
  const type = inferColumnType(key);
  if (type === 'currency' || type === 'number') return 'right';
  if (type === 'badge' || type === 'date') return 'center';
  return 'left';
}

function formatHeader(key: string): string {
  const result = key.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}
