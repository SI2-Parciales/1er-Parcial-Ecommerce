import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useReservationStream(branchId: string, isSoundEnabled: boolean = true) {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inicializar audio de manera segura
    try {
      audioRef.current = new Audio('/sounds/notification.mp3');
    } catch {
      // Ignorar si audio no está soportado en el entorno
    }
  }, []);

  useEffect(() => {
    if (!branchId) return;

    /* Endpoint SSE real comentado temporalmente (sin backend):
    const baseURL = import.meta.env.VITE_API_URL || 'https://api.fashionstore-app.com/api/v1';
    const eventSource = new EventSource(`${baseURL}/branches/${branchId}/reservations/stream`);

    eventSource.addEventListener('NEW_RESERVATION', () => {
      if (isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => console.warn('Audio play blocked by browser:', e));
      }
      queryClient.invalidateQueries({ queryKey: ['reservations', branchId] });
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => {
      eventSource.close();
    };
    */

    // Modo Offline: Soporte para actualizaciones en tiempo real locales vía CustomEvent
    const handleMockReservationEvent = () => {
      if (isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['reservations', branchId] });
    };

    window.addEventListener('MOCK_RESERVATION_UPDATE', handleMockReservationEvent);
    return () => {
      window.removeEventListener('MOCK_RESERVATION_UPDATE', handleMockReservationEvent);
    };
  }, [branchId, queryClient, isSoundEnabled]);
}
