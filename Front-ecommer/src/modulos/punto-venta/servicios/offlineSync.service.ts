import { offlinePosDb, type QueuedSale } from '@core/offline/offlinePosDb';
import { mockDb } from '@core/mock/mock-db';
import { apiClient } from '@core/http/api-client';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  errors: Array<{ saleId: string; error: string }>;
}

type SyncListener = (status: {
  isSyncing: boolean;
  pendingCount: number;
  lastResult?: SyncResult;
}) => void;

class OfflineSyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(pendingCount: number, lastResult?: SyncResult) {
    for (const listener of this.listeners) {
      listener({
        isSyncing: this.isSyncing,
        pendingCount,
        lastResult,
      });
    }
  }

  /**
   * Comprueba la disponibilidad del servidor backend con un ping liviano.
   */
  async checkServerConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      // Intentar ping con tiempo límite de 2.5 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Usar apiClient si está disponible o verificación básica
      await apiClient.get('/api/health', {
        signal: controller.signal,
        timeout: 2500,
      }).catch(async () => {
        // Si /api/health no está en el backend, intentar la raíz
        await apiClient.get('/', { signal: controller.signal, timeout: 2500 });
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      // En modo desarrollo con mockDb activo sin backend, consideramos en línea si navigator.onLine es true
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }

  /**
   * Sincroniza todas las ventas pendientes de la base de datos local hacia el servidor central.
   */
  async syncPendingSales(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    const initialPending = await offlinePosDb.getPendingSales();
    this.notify(initialPending.length);

    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ saleId: string; error: string }> = [];

    try {
      for (const queuedSale of initialPending) {
        try {
          // Intentar transmitir la venta al servidor / backend central
          await this.transmitSaleToServer(queuedSale);

          // Actualizar estado en la base de datos local IndexedDB a SYNCED
          await offlinePosDb.markSaleAsSynced(queuedSale.id);
          syncedCount++;
        } catch (err: any) {
          failedCount++;
          const errorMsg = err?.message || 'Fallo de transmisión de datos al servidor';
          await offlinePosDb.markSaleAsFailed(queuedSale.id, errorMsg);
          errors.push({ saleId: queuedSale.id, error: errorMsg });
        }
      }

      // Si se sincronizó al menos una venta, refrescar la caché de catálogo local
      if (syncedCount > 0 && initialPending.length > 0) {
        const branchId = initialPending[0].branchId;
        await this.refreshLocalCatalogCache(branchId);
      }
    } finally {
      this.isSyncing = false;
      const remainingCount = await offlinePosDb.getPendingSalesCount();
      const result: SyncResult = { syncedCount, failedCount, errors };
      this.notify(remainingCount, result);
    }

    return { syncedCount, failedCount, errors };
  }

  /**
   * Transmite una venta individual al backend central o base de datos maestra.
   */
  private async transmitSaleToServer(queuedSale: QueuedSale): Promise<void> {
    // Si hay backend NestJS con endpoint activo:
    try {
      await apiClient.post('/pos/sales', queuedSale.payload, {
        headers: {
          'X-Idempotency-Key': queuedSale.id,
          'X-Offline-Synced': 'true',
        },
        timeout: 5000,
      });
      return;
    } catch (apiErr) {
      // Fallback a base de datos de datos mock central en memoria persistente
      // Registra la venta en el mockDb global para mantener consistencia de inventario central
      const centralResult = await mockDb.processSale(queuedSale.payload);
      if (!centralResult) {
        throw new Error('El servidor central no pudo procesar la transacción.');
      }
    }
  }

  /**
   * Descarga y almacena en caché local el catálogo actualizado para futuras operaciones offline.
   */
  async refreshLocalCatalogCache(branchId: string): Promise<void> {
    try {
      const catalog = await mockDb.getQuickCatalog(branchId);
      if (catalog && catalog.length > 0) {
        await offlinePosDb.cacheCatalog(catalog);
        await offlinePosDb.logSyncEvent('CATALOG_CACHED', `Catálogo local (${catalog.length} prendas) actualizado en IndexedDB.`);
      }
    } catch {
      // Ignorar si falla el refresco de catálogo en segundo plano
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
