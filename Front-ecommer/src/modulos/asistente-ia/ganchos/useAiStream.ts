import { useRef, useCallback } from 'react';
import { useAiStore } from '../almacen/ai.store';
import { aiService, transformToAiReport } from '../servicios/ai.service';
import type { AiTimeframe } from '../tipos/ai.types';

export function useAiStream() {
  const activeTimeframe = useAiStore((state) => state.activeTimeframe);
  const selectedBranchId = useAiStore((state) => state.selectedBranchId);
  const addUserMessage = useAiStore((state) => state.addUserMessage);
  const addVoiceMessage = useAiStore((state) => state.addVoiceMessage);
  const updateMessageContent = useAiStore((state) => state.updateMessageContent);
  const appendStreamingChunk = useAiStore((state) => state.appendStreamingChunk);
  const finalizeReport = useAiStore((state) => state.finalizeReport);
  const setGenerating = useAiStore((state) => state.setGenerating);

  const cancelStreamRef = useRef<(() => void) | null>(null);

  const submitPrompt = useCallback(
    (promptText: string, customBranchId?: string, customTimeframe?: AiTimeframe) => {
      const cleanPrompt = promptText.trim();
      if (!cleanPrompt) return;

      // Cancelar stream previo si existía
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
      }

      const assistantMsgId = addUserMessage(cleanPrompt);

      const cancel = aiService.queryReportStream(
        {
          prompt: cleanPrompt,
          branchId: customBranchId || selectedBranchId || undefined,
          timeframe: customTimeframe || activeTimeframe,
        },
        (chunk) => {
          appendStreamingChunk(assistantMsgId, chunk);
        },
        (finalReport) => {
          finalizeReport(assistantMsgId, finalReport);
          cancelStreamRef.current = null;
        },
        (error) => {
          console.error('Error en streaming de IA:', error);
          appendStreamingChunk(assistantMsgId, `\n\n⚠️ **Error:** ${error.message}`);
          setGenerating(false);
          cancelStreamRef.current = null;
        }
      );

      cancelStreamRef.current = cancel;
    },
    [
      activeTimeframe,
      selectedBranchId,
      addUserMessage,
      appendStreamingChunk,
      finalizeReport,
      setGenerating,
    ]
  );

  const submitVoicePrompt = useCallback(
    async (audioBlob: Blob) => {
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
      }

      const { userMsgId, assistantMsgId } = addVoiceMessage('🎤 Transcribiendo audio con Whisper...');

      try {
        const response = await aiService.voiceReport(audioBlob);
        updateMessageContent(userMsgId, `🎤 "${response.transcription}"`);

        const report = transformToAiReport(response, response.transcription);
        finalizeReport(assistantMsgId, report);
      } catch (err: any) {
        console.error('Error en consulta por voz:', err);
        const detail = err?.response?.data?.detail || err?.message || 'Error al procesar audio en servidor.';
        updateMessageContent(userMsgId, '🎤 (Audio capturado)');
        appendStreamingChunk(assistantMsgId, `⚠️ **Error en consulta por voz:** ${detail}`);
        setGenerating(false);
      }
    },
    [addVoiceMessage, updateMessageContent, finalizeReport, appendStreamingChunk, setGenerating]
  );

  const cancelStream = useCallback(() => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
      setGenerating(false);
    }
  }, [setGenerating]);

  return {
    submitPrompt,
    submitVoicePrompt,
    cancelStream,
  };
}

