import { useNavigate } from 'react-router-dom';
import type { AiActionSuggestion } from '../tipos/ai.types';
import { ArrowRight, Lightbulb } from 'lucide-react';

interface SuggestedActionsListProps {
 actions?: AiActionSuggestion[];
}

export function SuggestedActionsList({ actions }: SuggestedActionsListProps) {
 const navigate = useNavigate();

 if (!actions || actions.length === 0) {
 return null;
 }

 return (
 <div className="my-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
 <div className="flex items-center gap-2 text-xs font-bold text-blue-900 ">
 <Lightbulb className="w-4 h-4 text-blue-600 " />
 <span>Acciones Operativas Sugeridas por el Asistente</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {actions.map((action) => (
 <button
 key={action.id}
 type="button"
 onClick={() => navigate(action.targetRoute)}
 className="p-3 bg-white border border-blue-200 rounded-xl text-left hover:border-blue-500 hover:shadow-sm transition-all group flex items-start justify-between gap-2 cursor-pointer"
 >
 <div>
 <p className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
 {action.title}
 </p>
 <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
 {action.description}
 </p>
 </div>
 <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
 </button>
 ))}
 </div>
 </div>
 );
}
