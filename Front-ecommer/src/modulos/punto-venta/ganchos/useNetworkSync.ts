import { useState, useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';
import { offlinePosDb } from '@core/offline/offlinePosDb';
import { offlineSyncService, type SyncResult } from '../servicios/offlineSync.service';

interface NetworkSyncStoreState {
  isSimulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  toggleSimulatedOffline: () => void;
}

export const useNetworkSyncStore = create<NetworkSyncStoreState>((set) => ({
  isSimulatedOffline: false,
  setSimulatedOffline: (val) => set({ isSimulatedOffline: val }),
  toggleSimulatedOffline: () => set((state) => ({ isSimulatedOffline: !state.isSimulatedOffline })),
}));

export function useNetworkSync() {
  const isSimulatedOffline = useNetworkSyncStore((state) => state.isSimulatedOffline);
  const toggleSimulateOffline = useNetworkSyncStore((state) => state.toggleSimulatedOffline);

  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // El estado de conectividad efectivo considera el navegador y la simulación
  const effectiveIsOnline = isBrowserOnline && !isSimulatedOffline;
  const prevEffectiveOnlineRef = useRef<boolean>(effectiveIsOnline);

  // Actualizar conteo de ventas pendientes
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlinePosDb.getPendingSalesCount();
      setPendingCount(count);
    } catch {
      // Ignorar si la base de datos se está inicializando
    }
  }, []);

  // Forzar sincronización manual
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!effectiveIsOnline) {
      return {
        syncedCount: 0,
        failedCount: 0,
        errors: [{ saleId: '', error: 'Sin conexión disponible para sincronizar.' }],
      };
    }

    setIsSyncing(true);
    try {
      const result = await offlineSyncService.syncPendingSales();
      setLastSyncResult(result);
      if (result.syncedCount > 0) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
      await refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [effectiveIsOnline, refreshPendingCount]);

  // 1. Listeners de eventos de red del navegador
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar conteo inicial
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  // 2. Suscribirse a cambios del servicio de sincronización
  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((status) => {
      setIsSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
      if (status.lastResult) {
        setLastSyncResult(status.lastResult);
      }
    });
    return unsubscribe;
  }, []);

  // 3. Auto-sincronización cuando se restablece la conexión (Offline -> Online)
  useEffect(() => {
    const wasOffline = !prevEffectiveOnlineRef.current;
    const isNowOnline = effectiveIsOnline;

    if (wasOffline && isNowOnline) {
      const timer = setTimeout(() => {
        syncNow();
      }, 1000);
      return () => clearTimeout(timer);
    }

    prevEffectiveOnlineRef.current = effectiveIsOnline;
  }, [effectiveIsOnline, syncNow]);

  // 4. Sondeo periódico ligero del contador cada 20 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 20000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return {
    isOnline: effectiveIsOnline,
    isBrowserOnline,
    isSimulatedOffline,
    isSyncing,
    pendingCount,
    lastSyncResult,
    lastSyncTime,
    syncNow,
    refreshPendingCount,
    toggleSimulateOffline,
  };
}
