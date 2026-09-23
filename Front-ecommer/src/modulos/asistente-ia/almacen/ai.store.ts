import { create } from 'zustand';
import type { AiChatMessage, AiTimeframe, AiReportResponse } from '../tipos/ai.types';

interface AiState {
  messages: AiChatMessage[];
  isListening: boolean;
  isGenerating: boolean;
  activeTimeframe: AiTimeframe;
  selectedBranchId: string | null;
  transcribedText: string;
  
  // Acciones
  addUserMessage: (prompt: string) => string;
  appendStreamingChunk: (messageId: string, chunk: string) => void;
  finalizeReport: (messageId: string, report: AiReportResponse) => void;
  setGenerating: (status: boolean) => void;
  setListening: (status: boolean) => void;
  setTranscribedText: (text: string) => void;
  setTimeframe: (timeframe: AiTimeframe) => void;
  setBranchFilter: (branchId: string | null) => void;
  clearHistory: () => void;
}

export const useAiStore = create<AiState>((set) => ({
  messages: [],
  isListening: false,
  isGenerating: false,
  activeTimeframe: 'THIS_MONTH',
  selectedBranchId: null,
  transcribedText: '',

  addUserMessage: (prompt: string) => {
    const userMsgId = `usr-${Date.now()}`;
    const assistantMsgId = `ast-${Date.now() + 1}`;
    const timestamp = new Date().toISOString();

    const userMessage: AiChatMessage = {
      id: userMsgId,
      sender: 'USER',
      content: prompt,
      timestamp,
    };

    const assistantPlaceholder: AiChatMessage = {
      id: assistantMsgId,
      sender: 'ASSISTANT',
      content: '',
      isLoading: true,
      timestamp,
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantPlaceholder],
      isGenerating: true,
    }));

    return assistantMsgId;
  },

  appendStreamingChunk: (messageId: string, chunk: string) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content: msg.content + chunk,
            isLoading: false,
          };
        }
        return msg;
      }),
    }));
  },

  finalizeReport: (messageId: string, report: AiReportResponse) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content: report.summaryMarkdown,
            reportData: report,
            isLoading: false,
          };
        }
        return msg;
      }),
      isGenerating: false,
    }));
  },

  setGenerating: (status: boolean) => {
    set({ isGenerating: status });
  },

  setListening: (status: boolean) => {
    set({ isListening: status });
  },

  setTranscribedText: (text: string) => {
    set({ transcribedText: text });
  },

  setTimeframe: (timeframe: AiTimeframe) => {
    set({ activeTimeframe: timeframe });
  },

  setBranchFilter: (branchId: string | null) => {
    set({ selectedBranchId: branchId });
  },

  clearHistory: () => {
    set({ messages: [] });
  },
}));
