import { useState, useMemo } from 'react';
import { Table as TableIcon, ChevronLeft, ChevronRight, Search, Printer, FileSpreadsheet, FileText } from 'lucide-react';
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

  const escapeXml = (unsafe: any): string => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Exportar a Excel (.xls) estructurado limpio - ÚNICAMENTE la tabla y totales, sin distorsión
  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

    let rowsXml = '';

    // Encabezados
    const headerCells = columns
      .map((col) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`)
      .join('');
    rowsXml += `<Row ss:Height="24">${headerCells}</Row>\n`;

    // Filas de datos
    filteredData.forEach((row) => {
      const dataCells = columns
        .map((col) => {
          const val = row[col.key] !== undefined ? row[col.key] : '';
          const isNum = typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && !String(val).startsWith('+') && !String(val).includes('-') && !col.key.toLowerCase().includes('sku') && !col.key.toLowerCase().includes('codigo'));
          const type = isNum ? 'Number' : 'String';
          const styleId = col.align === 'right' ? 'DataRight' : col.align === 'center' ? 'DataCenter' : 'DataLeft';
          return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
        })
        .join('');
      rowsXml += `<Row ss:Height="19">${dataCells}</Row>\n`;
    });

    // Fila de totales si existen
    if (totals && Object.keys(totals).length > 0) {
      const totalCells = columns
        .map((col) => {
          const val = totals[col.key] !== undefined ? totals[col.key] : '';
          const isNum = typeof val === 'number' || (!isNaN(Number(val)) && val !== '');
          const type = isNum ? 'Number' : 'String';
          return `<Cell ss:StyleID="TotalCell"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
        })
        .join('');
      rowsXml += `<Row ss:Height="22">${totalCells}</Row>\n`;
    }

    const xmlWorkbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Segoe UI" ss:Size="10"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="DataLeft">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataRight">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCell">
   <Font ss:Bold="1" ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Reporte_${escapeXml(reportCode)}">
  <Table>
   ${columns.map(() => '<Column ss:AutoFitWidth="1" ss:Width="120"/>').join('\n   ')}
   ${rowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayGridlines/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

    const blob = new Blob(['\uFEFF' + xmlWorkbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportCode}_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar ÚNICAMENTE la tabla a PDF / Imprimir Documento Aislado (sin capturas de la web)
  const handleExportPdf = () => {
    if (filteredData.length === 0) return;

    const headersHtml = columns
      .map((col) => `<th style="padding: 8px 10px; border: 1px solid #334155; background-color: #0f172a; color: #ffffff; text-align: ${col.align}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${col.header}</th>`)
      .join('');

    const rowsHtml = filteredData
      .map((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const cells = columns
          .map((col) => {
            const val = row[col.key] !== undefined ? String(row[col.key]) : '-';
            return `<td style="padding: 7px 10px; border: 1px solid #e2e8f0; text-align: ${col.align}; font-size: 10.5px; color: #1e293b;">${val}</td>`;
          })
          .join('');
        return `<tr style="background-color: ${bg};">${cells}</tr>`;
      })
      .join('');

    let totalsHtml = '';
    if (totals && Object.keys(totals).length > 0) {
      const totalsCells = columns
        .map((col) => {
          const val = totals[col.key] !== undefined ? String(totals[col.key]) : '';
          return `<td style="padding: 8px 10px; border: 1px solid #94a3b8; background-color: #f1f5f9; font-weight: bold; text-align: ${col.align}; font-size: 11px; color: #0f172a;">${val}</td>`;
        })
        .join('');
      totalsHtml = `<tfoot><tr>${totalsCells}</tr></tfoot>`;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${reportTitle} - ${reportCode}</title>
  <style>
    @page {
      size: letter landscape;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 12px;
      background: #ffffff;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    .report-name {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin: 0;
    }
    .meta-box {
      text-align: right;
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    .badge-code {
      display: inline-block;
      padding: 2px 8px;
      background-color: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th, td {
      word-break: break-word;
    }
    tr {
      page-break-inside: avoid;
    }
    .footer-notes {
      margin-top: 20px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <h1 class="brand-title">SISTEMA TEXTIL BOUTIQUE</h1>
      <p class="report-name">${reportTitle}</p>
    </div>
    <div class="meta-box">
      <div class="badge-code">${reportCode}</div>
      <div><strong>Emisión:</strong> ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div><strong>Registros:</strong> ${filteredData.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>${headersHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    ${totalsHtml}
  </table>

  <div class="footer-notes">
    <span>Reporte Oficial de Auditoría - Módulo Inteligente de Reportes Dinámicos</span>
    <span>Documento Oficial Certificado</span>
  </div>
</body>
</html>`;

    // Utilizar iframe invisible para aislar 100% la impresión y evitar popup blockers o capturas de la web completa
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Error al imprimir tabla:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 350);
    }
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

          {/* Exportar PDF / Imprimir Aislado */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Exportar a PDF exclusivamente la tabla analítica con membrete oficial"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          {/* Exportar Excel (.xls) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Exportar libro de Microsoft Excel (.xls) exclusivamente con los datos de la tabla"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xls)</span>
          </button>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Exportar a archivo plano CSV compatible"
          >
            <span>CSV</span>
          </button>

          {/* Imprimir directo */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Imprimir exclusivamente la tabla actual"
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
