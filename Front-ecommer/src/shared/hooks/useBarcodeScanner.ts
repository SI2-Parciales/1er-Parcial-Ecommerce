import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  maxIntervalMs?: number;
  minLength?: number;
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 40,
  minLength = 3,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Si el foco está en un input donde el usuario escribe manualmente, permitimos que el escáner funcione igual
      // pero si el intervalo es rápido (< maxIntervalMs), es un escáner físico.
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (event.key === 'Enter') {
        // Fin de ráfaga de escaneo
        if (bufferRef.current.length >= minLength && timeDiff <= maxIntervalMs * 2) {
          event.preventDefault();
          event.stopPropagation();
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';
          if (scannedCode) {
            onScanRef.current(scannedCode);
          }
        } else {
          // No era escáner o era muy corto, resetear buffer
          bufferRef.current = '';
        }
        return;
      }

      // Solo procesar caracteres alfanuméricos o imprimibles de un solo carácter
      if (event.key.length === 1) {
        if (timeDiff > maxIntervalMs) {
          // Más de 40ms entre pulsaciones: reiniciar ráfaga
          bufferRef.current = event.key;
        } else {
          // Ráfaga rápida (< 40ms): anexar al buffer
          bufferRef.current += event.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength]);
}
