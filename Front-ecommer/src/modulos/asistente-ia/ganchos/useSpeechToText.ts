import { useState, useEffect, useRef, useCallback } from 'react';
import { useAiStore } from '../almacen/ai.store';

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscriptComplete?: (finalText: string) => void;
}

export function useSpeechToText({
  lang = 'es-BO',
  onTranscriptComplete,
}: UseSpeechToTextOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isListening = useAiStore((state) => state.isListening);
  const setListening = useAiStore((state) => state.setListening);
  const setTranscribedText = useAiStore((state) => state.setTranscribedText);

  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar si ya estaba detenido
      }
    }
    setListening(false);
  }, [setListening]);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'El reconocimiento de voz no está soportado en este navegador. Se recomienda utilizar Google Chrome o Microsoft Edge.'
      );
      return;
    }

    setError(null);
    transcriptBufferRef.current = '';

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const currentText = final || interim;
        transcriptBufferRef.current = currentText;
        setTranscribedText(currentText);

        if (final && onTranscriptComplete) {
          onTranscriptComplete(final);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError(
            'Permiso de micrófono denegado. Permita el acceso al micrófono en el navegador para dictar comandos.'
          );
        } else if (event.error === 'no-speech') {
          // No se detectó voz
        } else {
          setError(`Error de reconocimiento: ${event.error}`);
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar reconocimiento de voz');
      setListening(false);
    }
  }, [lang, setListening, setTranscribedText, onTranscriptComplete]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
