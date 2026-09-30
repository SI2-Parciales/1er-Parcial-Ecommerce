import { aiApiClient } from '@core/http/api-client';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import type { 
  AiPromptPayload, 
  AiReportResponse,
  AiChartConfig,
  ReportKpiItem,
  ReportColumnDef
} from '../tipos/ai.types';

export interface ReportQueryFilterParams {
  branchId?: number;
  productId?: number;
  categoryId?: number;
}

export interface ReportQueryPayload {
  metrics: string[];
  groupBy?: string[];
  select?: string[];
  dateFrom?: string;
  dateTo?: string;
  filters?: ReportQueryFilterParams;
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface ReportQueryBackendResponse {
  metrics: string[];
  groupBy: string[];
  period: {
    from: string | null;
    to: string | null;
    timeZone: string;
  };
  data: Array<Record<string, string | number>>;
}

export interface ReportAskBackendResponse {
  query: string;
  answer: string;
  data: Array<{
    reportQuery: ReportQueryPayload;
    result: ReportQueryBackendResponse;
  }>;
}

export interface ReportVoiceBackendResponse {
  transcription: string;
  answer: string;
  data: Array<{
    reportQuery: ReportQueryPayload;
    result: ReportQueryBackendResponse;
  }>;
}

/**
 * Servicio de conexión con el agente analítico y endpoints oficiales de IA (FastAPI)
 * 100% Funcional conectado al backend y base de datos PostgreSQL real.
 */
export const aiService = {
  /**
   * Prompts recomendados basados en el rol y sucursal del usuario
   */
  async getSuggestedPrompts(branchId?: string): Promise<string[]> {
    if (branchId) {
      return [
        '¿Cuáles fueron los ingresos de mi sucursal en los últimos 7 días agrupados por día?',
        'Stock disponible y reservado de mi sucursal agrupado por producto',
        '¿Cuántas unidades se vendieron en mi sucursal este mes agrupadas por categoría?',
        'Ventas totales e ingresos de hoy en mi sucursal',
      ];
    }

    return [
      '¿Cuáles son los ingresos totales de este mes agrupados por sucursal?',
      'Cantidad de ventas y unidades vendidas de los últimos 7 días por día',
      'Stock disponible y reservado agrupado por producto',
      'Ingresos totales de este mes agrupados por día',
      'Stock disponible actual agrupado por categoría',
    ];
  },

  /**
   * Ejecuta una consulta en lenguaje natural contra el agente Gemini de FastAPI
   * Endpoint: POST /api/v1/reports/ask
   */
  async askReport(query: string): Promise<ReportAskBackendResponse> {
    const response = await aiApiClient.post<ReportAskBackendResponse>('/api/v1/reports/ask', {
      query,
    });
    return response.data;
  },

  /**
   * Envía un archivo de audio grabado por el navegador para transcripción y consulta
   * Endpoint: POST /api/v1/reports/voice
   */
  async voiceReport(audioBlob: Blob): Promise<ReportVoiceBackendResponse> {
    const formData = new FormData();
    // Determinar nombre y tipo según el blob
    const extension = audioBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm';
    formData.append('file', audioBlob, extension);

    const response = await aiApiClient.post<ReportVoiceBackendResponse>('/api/v1/reports/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Ejecuta una consulta estructurada directa
   * Endpoint: POST /api/v1/reports/query
   */
  async queryReport(queryPayload: ReportQueryPayload): Promise<ReportQueryBackendResponse> {
    const response = await aiApiClient.post<ReportQueryBackendResponse>('/api/v1/reports/query', queryPayload);
    return response.data;
  },

  /**
   * Procesa la consulta analítica con simulación de streaming de lectura de la respuesta oficial
   */
  queryReportStream(
    payload: AiPromptPayload,
    onChunk: (text: string) => void,
    onComplete: (report: AiReportResponse) => void,
    onError: (err: Error) => void
  ): () => void {
    let isCancelled = false;

    (async () => {
      try {
        // Enriquecer el prompt con contexto de filtro si no está explícito en la redacción
        let fullQuery = payload.prompt.trim();
        if (payload.branchId && !fullQuery.toLowerCase().includes('sucursal')) {
          fullQuery += ` (Filtro sucursal: ${payload.branchId})`;
        }
        if (payload.timeframe && !fullQuery.toLowerCase().includes('mes') && !fullQuery.toLowerCase().includes('hoy') && !fullQuery.toLowerCase().includes('días')) {
          const timeframeLabels: Record<string, string> = {
            TODAY: 'de hoy',
            LAST_7_DAYS: 'de los últimos 7 días',
            THIS_MONTH: 'de este mes',
            CURRENT_SEASON: 'de esta temporada',
            YEAR_TO_DATE: 'de este año',
          };
          if (timeframeLabels[payload.timeframe]) {
            fullQuery += ` ${timeframeLabels[payload.timeframe]}`;
          }
        }

        // Llamar a FastAPI /api/v1/reports/ask
        const backendResponse = await aiService.askReport(fullQuery);

        if (isCancelled) return;

        // Construir el reporte final enriquecido con datos reales
        const finalReport = transformToAiReport(backendResponse, payload.prompt);

        // Streaming fluido de la respuesta sintética palabra por palabra
        const words = finalReport.summaryMarkdown.split(' ');
        let currentIndex = 0;

        const intervalId = setInterval(() => {
          if (isCancelled) {
            clearInterval(intervalId);
            return;
          }

          if (currentIndex < words.length) {
            const nextWord = (currentIndex === 0 ? '' : ' ') + words[currentIndex];
            onChunk(nextWord);
            currentIndex++;
          } else {
            clearInterval(intervalId);
            onComplete(finalReport);
          }
        }, 30);
      } catch (error: any) {
        if (!isCancelled) {
          let detail = error?.response?.data?.detail;
          if (!detail) {
            if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
              detail = 'No se pudo conectar con el servicio de IA (http://localhost:8000). Asegúrate de que FastAPI esté ejecutándose en el puerto 8000.';
            } else {
              detail = error?.message || 'Error al comunicarse con el servicio de IA.';
            }
          }
          onError(new Error(detail));
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  },
};

/**
 * Transforma la respuesta estructurada de FastAPI en el formato de visualización del frontend
 */
export function transformToAiReport(
  backendResponse: ReportAskBackendResponse | ReportVoiceBackendResponse,
  originalPrompt: string
): AiReportResponse {
  const user = useAuthStore.getState().user;
  const execution = backendResponse.data && backendResponse.data.length > 0 ? backendResponse.data[0] : null;
  const result = execution?.result;
  const rawRows = result?.data || [];

  // Normalizar filas para que reconozcan tanto snake_case (proveniente de select) como camelCase
  const rows = rawRows.map((row) => {
    const r: Record<string, string | number> = { ...row };
    if (r['units_sold'] !== undefined && r['unitsSold'] === undefined) {
      r['unitsSold'] = r['units_sold'];
    } else if (r['unitsSold'] !== undefined && r['units_sold'] === undefined) {
      r['units_sold'] = r['unitsSold'];
    }

    if (r['sales_count'] !== undefined && r['salesCount'] === undefined) {
      r['salesCount'] = r['sales_count'];
    } else if (r['salesCount'] !== undefined && r['sales_count'] === undefined) {
      r['sales_count'] = r['salesCount'];
    }

    if (r['available_stock'] !== undefined && r['availableStock'] === undefined) {
      r['availableStock'] = r['available_stock'];
    } else if (r['availableStock'] !== undefined && r['available_stock'] === undefined) {
      r['available_stock'] = r['availableStock'];
    }

    if (r['reserved_stock'] !== undefined && r['reservedStock'] === undefined) {
      r['reservedStock'] = r['reserved_stock'];
    } else if (r['reservedStock'] !== undefined && r['reserved_stock'] === undefined) {
      r['reserved_stock'] = r['reservedStock'];
    }

    return r;
  });

  // 1. Columnas estructuradas
  const columns: ReportColumnDef[] = [];
  const groupBy = result?.groupBy || [];
  const metrics = result?.metrics || [];

  if (groupBy.includes('branch')) {
    columns.push({ key: 'branch', header: 'Sucursal', align: 'left', type: 'text' });
  }
  if (groupBy.includes('product')) {
    columns.push({ key: 'product', header: 'Producto', align: 'left', type: 'text' });
  }
  if (groupBy.includes('category')) {
    columns.push({ key: 'category', header: 'Categoría', align: 'left', type: 'text' });
  }
  if (groupBy.includes('day')) {
    columns.push({ key: 'day', header: 'Fecha', align: 'center', type: 'date' });
  }
  if (groupBy.includes('month')) {
    columns.push({ key: 'month', header: 'Mes', align: 'center', type: 'date' });
  }

  if (metrics.includes('revenue')) {
    columns.push({ key: 'revenue', header: 'Ingresos (Bs.)', align: 'right', type: 'currency' });
  }
  if (metrics.includes('sales_count')) {
    columns.push({ key: 'salesCount', header: 'Cant. Ventas', align: 'right', type: 'number' });
  }
  if (metrics.includes('units_sold')) {
    columns.push({ key: 'unitsSold', header: 'Unid. Vendidas', align: 'right', type: 'number' });
  }
  if (metrics.includes('available_stock')) {
    columns.push({ key: 'availableStock', header: 'Stock Disp.', align: 'right', type: 'number' });
  }
  if (metrics.includes('reserved_stock')) {
    columns.push({ key: 'reservedStock', header: 'Stock Reserv.', align: 'right', type: 'number' });
  }

  // Si hay columnas adicionales en los datos no mapeadas arriba, incorporarlas
  if (rows.length > 0) {
    const firstRow = rows[0];
    Object.keys(firstRow).forEach((key) => {
      if (
        !key.endsWith('Id') &&
        !['units_sold', 'sales_count', 'available_stock', 'reserved_stock'].includes(key) &&
        !columns.some((c) => c.key === key)
      ) {
        columns.push({
          key,
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          align: typeof firstRow[key] === 'number' ? 'right' : 'left',
          type: typeof firstRow[key] === 'number' ? 'number' : 'text',
        });
      }
    });
  }


  // 2. Cálculo de KPIs reales a partir de los datos
  const kpis: ReportKpiItem[] = [];
  const totals: Record<string, string | number> = {};

  if (metrics.includes('revenue')) {
    const totalRevenue = rows.reduce((acc, r) => acc + (Number(r.revenue) || 0), 0);
    totals['revenue'] = totalRevenue;
    kpis.push({
      label: 'Ingresos Totales',
      value: `Bs. ${totalRevenue.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: `${rows.length} grupos procesados`,
      type: 'moneda',
      trend: 'up',
    });
  }
  if (metrics.includes('sales_count')) {
    const totalSales = rows.reduce((acc, r) => acc + (Number(r.salesCount) || 0), 0);
    totals['salesCount'] = totalSales;
    kpis.push({
      label: 'Ventas Totales',
      value: totalSales.toLocaleString('es-BO'),
      subtext: 'Transacciones aprobadas',
      type: 'numero',
      trend: 'up',
    });
  }
  if (metrics.includes('units_sold')) {
    const totalUnits = rows.reduce((acc, r) => acc + (Number(r.unitsSold) || 0), 0);
    totals['unitsSold'] = totalUnits;
    kpis.push({
      label: 'Unidades Vendidas',
      value: totalUnits.toLocaleString('es-BO'),
      subtext: 'Prendas entregadas',
      type: 'numero',
      trend: 'up',
    });
  }
  if (metrics.includes('available_stock')) {
    const totalStock = rows.reduce((acc, r) => acc + (Number(r.availableStock) || 0), 0);
    totals['availableStock'] = totalStock;
    kpis.push({
      label: 'Stock Disponible',
      value: totalStock.toLocaleString('es-BO'),
      subtext: 'Existencias físicas',
      type: 'numero',
    });
  }
  if (metrics.includes('reserved_stock')) {
    const totalReserved = rows.reduce((acc, r) => acc + (Number(r.reservedStock) || 0), 0);
    totals['reservedStock'] = totalReserved;
    kpis.push({
      label: 'Stock Reservado',
      value: totalReserved.toLocaleString('es-BO'),
      subtext: 'Apartados en tienda',
      type: 'numero',
    });
  }

  if (rows.length > 0) {
    kpis.push({
      label: 'Registros Analizados',
      value: rows.length,
      subtext: result?.period?.from ? `${result.period.from} a ${result.period.to || 'hoy'}` : 'Vigente',
      type: 'numero',
    });
  }

  // 3. Generación de Gráfico Dinámico
  let chart: AiChartConfig | undefined = undefined;
  if (rows.length > 0) {
    const dimensionKey = groupBy[0] || (rows[0].branch ? 'branch' : rows[0].day ? 'day' : rows[0].month ? 'month' : rows[0].product ? 'product' : 'category');
    
    let primaryMetricKey: string | null = null;
    let primaryMetricLabel = '';
    let primaryColor = '#2563EB';

    if (metrics.includes('revenue')) {
      primaryMetricKey = 'revenue';
      primaryMetricLabel = 'Ingresos (Bs.)';
      primaryColor = '#2563EB';
    } else if (metrics.includes('units_sold')) {
      primaryMetricKey = 'unitsSold';
      primaryMetricLabel = 'Unidades Vendidas';
      primaryColor = '#10B981';
    } else if (metrics.includes('sales_count')) {
      primaryMetricKey = 'salesCount';
      primaryMetricLabel = 'Ventas Realizadas';
      primaryColor = '#8B5CF6';
    } else if (metrics.includes('available_stock')) {
      primaryMetricKey = 'availableStock';
      primaryMetricLabel = 'Stock Disponible';
      primaryColor = '#F59E0B';
    } else if (metrics.includes('reserved_stock')) {
      primaryMetricKey = 'reservedStock';
      primaryMetricLabel = 'Stock Reservado';
      primaryColor = '#EC4899';
    }

    if (dimensionKey && primaryMetricKey) {
      const isTemporal = dimensionKey === 'day' || dimensionKey === 'month';
      chart = {
        type: isTemporal ? 'LINE' : 'BAR',
        xAxisKey: 'label',
        series: [
          {
            dataKey: primaryMetricKey,
            label: primaryMetricLabel,
            color: primaryColor,
          },
        ],
        data: rows.map((r) => ({
          label: String(r[dimensionKey] || 'N/A'),
          [primaryMetricKey!]: Number(r[primaryMetricKey!]) || 0,
        })),
      };
    }
  }

  // Formato de Período y Ámbito
  const periodText = result?.period?.from 
    ? `${result.period.from} al ${result.period.to || 'presente'}` 
    : 'Período Vigente';

  const scopeText = user?.role === 'ADMIN'
    ? 'Consolidado General (Todas las Sucursales)'
    : user?.assignedBranchName || 'Sucursal Asignada';

  return {
    queryId: `qry-${Date.now()}`,
    prompt: originalPrompt,
    reportCode: `INF-${Date.now().toString().slice(-4)}`,
    title: metrics.length > 0 
      ? `INFORME ANALÍTICO: ${metrics.map((m) => m.toUpperCase().replace('_', ' ')).join(' & ')}`
      : 'INFORME DE CONSULTA ANALÍTICA',
    scope: scopeText,
    period: periodText,
    requester: user ? `${user.name} (${user.role})` : 'Usuario Autorizado',
    summaryMarkdown: backendResponse.answer,
    kpis: kpis.length > 0 ? kpis : undefined,

    columns: columns.length > 0 ? columns : undefined,
    tabularData: rows.length > 0 ? (rows as Array<Record<string, string | number>>) : undefined,
    totals: Object.keys(totals).length > 0 ? totals : undefined,
    chart,
    suggestedActions: [
      {
        id: 'act-1',
        title: 'Ver Catálogo e Inventario',
        description: 'Examinar prendas y stock detallado en el módulo de catálogo',
        actionType: 'NAVIGATE',
        targetRoute: '/catalogo',
      },
      {
        id: 'act-2',
        title: 'Gestión de Reservas',
        description: 'Revisar reservas en tienda y pedidos pendientes',
        actionType: 'NAVIGATE',
        targetRoute: '/reservas',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
