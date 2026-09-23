import { Mic, MicOff } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface VoiceInputButtonProps {
 isListening: boolean;
 onClick: () => void;
 disabled?: boolean;
}

export function VoiceInputButton({
 isListening,
 onClick,
 disabled = false,
}: VoiceInputButtonProps) {
 return (
 <div className="relative flex items-center justify-center">
 {/* Ondas Sonoras Pulsantes mientras escucha */}
 {isListening && (
 <>
 <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
 <span className="absolute inline-flex h-12 w-12 rounded-full bg-red-500/30 animate-pulse" />
 </>
 )}

 <button
 type="button"
 disabled={disabled}
 onClick={onClick}
 className={cn(
 "relative z-10 p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer",
 isListening
 ? "bg-red-600 text-white shadow-red-500/40 ring-4 ring-red-300 "
 : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600 "
 )}
 title={isListening ? "Detener dictado por voz" : "Dictar consulta con voz (Web Speech API)"}
 >
 {isListening ? (
 <MicOff className="w-5 h-5 animate-pulse" />
 ) : (
 <Mic className="w-5 h-5" />
 )}
 </button>
 </div>
 );
}
