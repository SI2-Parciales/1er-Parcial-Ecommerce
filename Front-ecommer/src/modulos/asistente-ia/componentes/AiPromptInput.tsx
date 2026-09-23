import { useState, useRef, useEffect } from 'react';
import { useAiStore } from '../almacen/ai.store';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { useSpeechToText } from '../ganchos/useSpeechToText';
import { VoiceInputButton } from './VoiceInputButton';
import type { AiTimeframe } from '../tipos/ai.types';
import { Send, Store, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface AiPromptInputProps {
 onSubmit: (prompt: string) => void;
 isGenerating: boolean;
}

const TIMEFRAME_OPTIONS: Array<{ value: AiTimeframe; label: string }> = [
 { value: 'TODAY', label: 'Hoy' },
 { value: 'LAST_7_DAYS', label: 'Últimos 7 días' },
 { value: 'THIS_MONTH', label: 'Este Mes' },
 { value: 'CURRENT_SEASON', label: 'Temporada Actual' },
 { value: 'YEAR_TO_DATE', label: 'Año en Curso' },
];

export function AiPromptInput({ onSubmit, isGenerating }: AiPromptInputProps) {
 const { user } = useAuthStore();
 const isAdmin = user?.role === 'ADMIN';

 const [promptText, setPromptText] = useState('');
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 const activeTimeframe = useAiStore((state) => state.activeTimeframe);
 const setTimeframe = useAiStore((state) => state.setTimeframe);
 const selectedBranchId = useAiStore((state) => state.selectedBranchId);
 const setBranchFilter = useAiStore((state) => state.setBranchFilter);

 const { isListening, toggleListening, error: speechError } = useSpeechToText({
 onTranscriptComplete: (finalText) => {
 setPromptText((prev) => (prev ? `${prev} ${finalText}` : finalText));
 },
 });

 // Auto-ajuste de altura del textarea
 useEffect(() => {
 if (textareaRef.current) {
 textareaRef.current.style.height = 'auto';
 textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
 }
 }, [promptText]);

 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 };

 const handleSend = () => {
 if (!promptText.trim() || isGenerating) return;
 onSubmit(promptText);
 setPromptText('');
 if (textareaRef.current) {
 textareaRef.current.style.height = 'auto';
 }
 };

 return (
 <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md p-3 space-y-3">
 {/* Barra de Filtros Contextuales (Temporalidad y Sucursal) */}
 <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-gray-100 pb-2.5">
 {/* Píldoras de Temporalidad */}
 <div className="flex items-center gap-1 overflow-x-auto py-0.5">
 <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1 shrink-0" />
 {TIMEFRAME_OPTIONS.map((tf) => (
 <button
 key={tf.value}
 type="button"
 onClick={() => setTimeframe(tf.value)}
 className={cn(
 "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer",
 activeTimeframe === tf.value
 ? "bg-blue-600 text-white shadow-xs"
 : "bg-gray-100 text-gray-600 hover:bg-gray-200 "
 )}
 >
 {tf.label}
 </button>
 ))}
 </div>

 {/* Selector de Sucursal contextual */}
 <div className="flex items-center gap-1.5 shrink-0">
 <Store className="w-3.5 h-3.5 text-gray-400" />
 {isAdmin ? (
 <select
 value={selectedBranchId || ''}
 onChange={(e) => setBranchFilter(e.target.value || null)}
 className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
 >
 <option value="">Consolidado (Todas las Tiendas)</option>
 <option value="branch-1">Sucursal Central (La Paz)</option>
 <option value="branch-2">Sucursal Equipetrol (Santa Cruz)</option>
 <option value="branch-3">Sucursal Calacoto (Zona Sur)</option>
 </select>
 ) : (
 <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 ">
 {user?.assignedBranchName || 'Sucursal Asignada'}
 </span>
 )}
 </div>
 </div>

 {/* Alerta de error de reconocimiento de voz */}
 {speechError && (
 <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 ">
 <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
 <span>{speechError}</span>
 </div>
 )}

 {/* Área de Entrada de Texto y Botones */}
 <div className="flex items-end gap-2">
 <div className="flex-1 relative">
 <textarea
 ref={textareaRef}
 rows={1}
 value={promptText}
 onChange={(e) => setPromptText(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder={
 isListening
 ? 'Escuchando tu voz... (habla con naturalidad)'
 : 'Escribe una consulta o presiona el micrófono para dictar...'
 }
 disabled={isGenerating}
 className={cn(
 "w-full px-3.5 py-2.5 text-sm bg-transparent border-none rounded-xl resize-none focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 max-h-40 min-h-[42px]",
 isListening && "animate-pulse placeholder-red-500 font-medium"
 )}
 />
 </div>

 {/* Botón de Dictado por Voz */}
 <VoiceInputButton
 isListening={isListening}
 onClick={toggleListening}
 disabled={isGenerating}
 />

 {/* Botón de Enviar Consulta */}
 <button
 type="button"
 disabled={!promptText.trim() || isGenerating}
 onClick={handleSend}
 className={cn(
 "p-2.5 rounded-xl text-white font-semibold transition-all flex items-center justify-center cursor-pointer shadow-sm",
 !promptText.trim() || isGenerating
 ? "bg-gray-300 text-gray-400 cursor-not-allowed shadow-none"
 : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-600/30"
 )}
 title="Enviar consulta (Enter)"
 >
 <Send className="w-5 h-5" />
 </button>
 </div>
 </div>
 );
}
