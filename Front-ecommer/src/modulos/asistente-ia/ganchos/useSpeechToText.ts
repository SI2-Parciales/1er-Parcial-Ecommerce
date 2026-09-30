import { useState, useEffect, useRef, useCallback } from 'react';
import { useAiStore } from '../almacen/ai.store';

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscriptComplete?: (finalText: string) => void;
  onAudioRecorded?: (audioBlob: Blob) => void;
}

export function useSpeechToText({
  lang = 'es-BO',
  onTranscriptComplete,
  onAudioRecorded,
}: UseSpeechToTextOptions = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isListening = useAiStore((state) => state.isListening);
  const setListening = useAiStore((state) => state.setListening);
  const setTranscribedText = useAiStore((state) => state.setTranscribedText);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const hasMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    setIsSupported(hasMedia);
  }, []);

  const stopListening = useCallback(() => {
    // 1. Detener reconocimiento webkit si estaba activo
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar
      }
    }

    // 2. Detener MediaRecorder para emitir el audio real
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignorar
      }
    }

    // 3. Detener pistas de audio del micrófono
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setListening(false);
  }, [setListening]);

  const startListening = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    // Validar acceso al micrófono
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no admite la grabación de audio desde el micrófono.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determinar formato soportado por el navegador
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0 && onAudioRecorded) {
          onAudioRecorded(audioBlob);
        }
      };

      recorder.start();
      setListening(true);

      // Si el navegador cuenta con SpeechRecognition, usarlo en paralelo para feedback visual
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = lang;
          recognition.interimResults = true;
          recognition.continuous = false;

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
            setTranscribedText(currentText);

            if (final && onTranscriptComplete) {
              onTranscriptComplete(final);
            }
          };

          recognition.onerror = () => {
            // No interrumpir la grabación de audio si el recognizer del browser falla
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          // Si falla SpeechRecognition nativo, la grabación de MediaRecorder sigue activa
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permiso de micrófono denegado. Permita el acceso al micrófono para enviar consultas por voz.');
      } else {
        setError(`Error al acceder al micrófono: ${err.message || err.name}`);
      }
      setListening(false);
    }
  }, [lang, setListening, setTranscribedText, onTranscriptComplete, onAudioRecorded]);

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
