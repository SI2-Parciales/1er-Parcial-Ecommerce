import { Sparkles, TrendingUp, PackageSearch, CalendarClock, ArrowUpRight } from 'lucide-react';

interface SuggestedPromptChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  variant?: 'grid' | 'pills';
}

const ICONS = [TrendingUp, CalendarClock, PackageSearch, Sparkles];

export function SuggestedPromptChips({
  prompts,
  onSelect,
  disabled = false,
  variant = 'grid',
}: SuggestedPromptChipsProps) {
  if (!prompts || prompts.length === 0) return null;

  if (variant === 'pills') {
    return (
      <div className="flex items-center gap-2 py-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 shrink-0 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Sugerencias:</span>
        </div>
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-full transition-all shrink-0 cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>Consultas frecuentes recomendadas</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
        {prompts.slice(0, 4).map((prompt, idx) => {
          const IconComponent = ICONS[idx % ICONS.length];
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(prompt)}
              className="group p-3 bg-white hover:bg-blue-50/40 border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-start gap-2.5 text-left cursor-pointer disabled:opacity-40"
            >
              <div className="p-1.5 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition-colors shrink-0 mt-0.5">
                <IconComponent className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 leading-snug line-clamp-2">
                  {prompt}
                </p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
