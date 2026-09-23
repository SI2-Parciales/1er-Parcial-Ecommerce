import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AiReportResponse } from '../tipos/ai.types';
import { AiDynamicChart } from './AiDynamicChart';
import { AiDataTable } from './AiDataTable';
import { SuggestedActionsList } from './SuggestedActionsList';
import { Sparkles, Loader2, FileCheck2, Building2, Calendar, UserCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DynamicReportRendererProps {
  content: string;
  reportData?: AiReportResponse;
  isLoading?: boolean;
}

export function DynamicReportRenderer({
  content,
  reportData,
  isLoading,
}: DynamicReportRendererProps) {
  return (
    <div className="space-y-5 print:space-y-3">
      {/* Membrete y Ficha Técnica de Auditoría Formal */}
      {reportData && (
        <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                <FileCheck2 className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <span className="text-[10px] tracking-widest uppercase font-mono text-indigo-300 font-bold">
                  Documento Ejecutivo Oficial
                </span>
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  {reportData.title || 'INFORME ANALÍTICO DE GESTIÓN RETAIL'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-white/10 text-indigo-200 border border-white/10">
                {reportData.reportCode || 'INF-2026'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CERTIFICADO
              </span>
            </div>
          </div>

          {/* Ficha Técnica de Metadatos */}
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-slate-400">Ámbito / Sucursal</p>
                <p className="font-semibold text-slate-800 truncate">{reportData.scope || 'Consolidado General'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-slate-400">Período de Análisis</p>
                <p className="font-semibold text-slate-800 truncate">{reportData.period || 'Septiembre 2026'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-slate-400">Emitido Para</p>
                <p className="font-semibold text-slate-800 truncate">{reportData.requester || 'Administración'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-slate-400">Hora de Generación</p>
                <p className="font-mono text-[11px] font-semibold text-slate-800">
                  {new Date(reportData.generatedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Panel de KPI Cards de Alto Impacto */}
          {reportData.kpis && reportData.kpis.length > 0 && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
              {reportData.kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 bg-linear-to-b from-slate-50/60 to-white hover:border-indigo-200 transition shadow-2xs"
                >
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-lg font-extrabold text-slate-900 tracking-tight font-mono">
                      {kpi.value}
                    </span>
                    {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />}
                    {kpi.trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </div>
                  {kpi.subtext && <p className="mt-1 text-[11px] text-slate-400 truncate">{kpi.subtext}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Síntesis Ejecutiva en Markdown */}
      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 italic py-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Consultando datos y estructurando informe ejecutivo formal...</span>
          </div>
        ) : null}

        {isLoading && content && (
          <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1 align-middle" />
        )}
      </div>

      {/* Visualización Gráfica Interactiva */}
      {reportData?.chart && reportData.chart.data && reportData.chart.data.length > 0 && (
        <AiDynamicChart config={reportData.chart} />
      )}

      {/* TABLA EJECUTIVA FORMAL (Núcleo del requerimiento) */}
      {reportData?.tabularData && reportData.tabularData.length > 0 && (
        <AiDataTable
          data={reportData.tabularData}
          columnsDef={reportData.columns}
          totals={reportData.totals}
          reportTitle={reportData.title}
          reportCode={reportData.reportCode}
        />
      )}

      {/* Acciones Operativas Sugeridas */}
      {reportData?.suggestedActions && reportData.suggestedActions.length > 0 && (
        <SuggestedActionsList actions={reportData.suggestedActions} />
      )}

      {/* Pie de Reporte Formal */}
      {reportData && (
        <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Generado con Inteligencia Analítica basada en datos consolidados de Retail Core</span>
          </div>
          <span className="font-mono">
            {new Date(reportData.generatedAt).toLocaleDateString('es-BO', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
