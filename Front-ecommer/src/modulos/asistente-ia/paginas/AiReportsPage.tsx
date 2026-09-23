import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAiStore } from '../almacen/ai.store';
import { useAiStream } from '../ganchos/useAiStream';
import { aiService } from '../servicios/ai.service';
import { AiPromptInput } from '../componentes/AiPromptInput';
import { SuggestedPromptChips } from '../componentes/SuggestedPromptChips';
import { DynamicReportRenderer } from '../componentes/DynamicReportRenderer';
import { Bot, Sparkles, Trash2, User } from 'lucide-react';

export function AiReportsPage() {
 const messages = useAiStore((state) => state.messages);
 const isGenerating = useAiStore((state) => state.isGenerating);
 const clearHistory = useAiStore((state) => state.clearHistory);
 const selectedBranchId = useAiStore((state) => state.selectedBranchId);

 const { submitPrompt } = useAiStream();
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Consultar preguntas recomendadas según el contexto
 const { data: suggestedPrompts = [] } = useQuery({
 queryKey: ['ai-suggested-prompts', selectedBranchId],
 queryFn: () => aiService.getSuggestedPrompts(selectedBranchId || undefined),
 });

 // Scroll automático hacia el último mensaje o token entrante
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, isGenerating]);

 return (
 <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-4 max-w-5xl mx-auto">
 {/* Encabezado del Módulo */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 px-1">
 <div>
 <div className="flex items-center gap-2">
 <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
 <Bot className="w-5 h-5" />
 </div>
 <h1 className="text-xl font-bold text-gray-900 ">
 Asistente Ejecutivo IA
 </h1>
 </div>
 <p className="text-xs text-gray-500 mt-0.5">
 Analítica generativa de ventas, probadores físicos y diagnóstico de inventario por texto o voz
 </p>
 </div>

 {messages.length > 0 && (
 <button
 type="button"
 onClick={clearHistory}
 className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" />
 <span>Limpiar Historial</span>
 </button>
 )}
 </div>

 {/* Área de Conversación / Respuestas */}
 <div className="flex-1 min-h-0 overflow-y-auto px-1 space-y-5">
      {messages.length === 0 ? (
        /* Estado Vacío de Bienvenida */
        <div className="my-auto py-6 px-4 flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-4 ring-blue-50">
              <Sparkles className="w-7 h-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider border-2 border-white shadow-2xs">
              IA
            </span>
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              ¿En qué puedo ayudarte hoy?
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Formula cualquier consulta sobre existencias en tiendas, rotación de tallas, conversión en probadores o auditoría de ventas.
            </p>
          </div>

          <div className="w-full pt-2">
            <SuggestedPromptChips
              prompts={suggestedPrompts}
              onSelect={(p) => submitPrompt(p)}
              disabled={isGenerating}
              variant="grid"
            />
          </div>
        </div>
      ) : (
        /* Lista de Mensajes del Historial */
        messages.map((msg) => {
          const isUser = msg.sender === 'USER';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white border border-gray-200 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <DynamicReportRenderer
                    content={msg.content}
                    reportData={msg.reportData}
                    isLoading={msg.isLoading}
                  />
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Barra Inferior Fija de Consulta */}
    <div className="shrink-0 space-y-2">
      {messages.length > 0 && suggestedPrompts.length > 0 && (
        <div className="px-1">
          <SuggestedPromptChips
            prompts={suggestedPrompts.slice(0, 4)}
            onSelect={(p) => submitPrompt(p)}
            disabled={isGenerating}
            variant="pills"
          />
        </div>
      )}

 <AiPromptInput
 onSubmit={(prompt) => submitPrompt(prompt)}
 isGenerating={isGenerating}
 />
 </div>
 </div>
 );
}
