import type { ProcessSalePayload, SaleReceipt, PosCatalogProduct, PosCartItem } from '@modulos/punto-venta/tipos/pos.types';

export interface QueuedSale {
  id: string;
  offlineInvoiceNumber: string;
  branchId: string;
  cashierId: string;
  payload: ProcessSalePayload;
  receipt: SaleReceipt;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  attempts: number;
  lastAttemptAt?: string;
  errorLog?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface LocalInventoryStock {
  cacheKey: string; // `${branchId}_${variantId}`
  branchId: string;
  variantId: string;
  availableStock: number;
  lastUpdated: string;
}

export interface SyncAuditLog {
  id: string;
  timestamp: string;
  event: 'OFFLINE_SALE_SAVED' | 'SYNC_SUCCESS' | 'SYNC_FAILED' | 'CATALOG_CACHED' | 'STOCK_DECREMENTED';
  details: string;
  count?: number;
}

const DB_NAME = 'FashionStore_POS_OfflineDB';
const DB_VERSION = 1;

class OfflinePosDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este entorno.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Cola de Ventas Locales (Transacciones Offline)
        if (!db.objectStoreNames.contains('sales_queue')) {
          const salesStore = db.createObjectStore('sales_queue', { keyPath: 'id' });
          salesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          salesStore.createIndex('createdAt', 'createdAt', { unique: false });
          salesStore.createIndex('branchId', 'branchId', { unique: false });
        }

        // 2. Caché de Catálogo de Productos y Código de Barras
        if (!db.objectStoreNames.contains('catalog_cache')) {
          const catStore = db.createObjectStore('catalog_cache', { keyPath: 'id' });
          catStore.createIndex('category', 'category', { unique: false });
        }

        // 3. Caché de Stock de Inventario Local por Sucursal
        if (!db.objectStoreNames.contains('inventory_cache')) {
          const invStore = db.createObjectStore('inventory_cache', { keyPath: 'cacheKey' });
          invStore.createIndex('branchId', 'branchId', { unique: false });
          invStore.createIndex('variantId', 'variantId', { unique: false });
        }

        // 4. Registro de Auditoría de Sincronización
        if (!db.objectStoreNames.contains('sync_audit_log')) {
          const logStore = db.createObjectStore('sync_audit_log', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('No se pudo abrir la base de datos local IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Guarda una venta en la base de datos local (IndexedDB) con estado PENDING.
   */
  async saveOfflineSale(payload: ProcessSalePayload, receipt: SaleReceipt): Promise<QueuedSale> {
    const db = await this.getDB();
    const queuedSale: QueuedSale = {
      id: receipt.saleId,
      offlineInvoiceNumber: receipt.invoiceNumber,
      branchId: payload.branchId,
      cashierId: payload.cashierId,
      payload,
      receipt: {
        ...receipt,
        isOffline: true,
        offlineInvoiceNumber: receipt.invoiceNumber,
      },
      syncStatus: 'PENDING',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readwrite');
      const store = tx.objectStore('sales_queue');
      const req = store.put(queuedSale);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Descontar stock localmente para evitar sobreventas fuera de línea
    for (const item of payload.items) {
      await this.decrementLocalStock(payload.branchId, item.variantId, item.quantity);
    }

    // Registrar en auditoría
    await this.logSyncEvent(
      'OFFLINE_SALE_SAVED',
      `Venta offline ${queuedSale.offlineInvoiceNumber} (Bs. ${payload.totalAmount}) guardada en IndexedDB.`
    );

    return queuedSale;
  }

  /**
   * Obtiene todas las ventas pendientes de sincronización (FIFO).
   */
  async getPendingSales(): Promise<QueuedSale[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readonly');
      const store = tx.objectStore('sales_queue');
      const index = store.index('syncStatus');
      const req = index.getAll('PENDING');

      req.onsuccess = () => {
        const results = req.result as QueuedSale[];
        // Ordenar cronológicamente (FIFO)
        results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Conteo reactivo rápido de ventas pendientes.
   */
  async getPendingSalesCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readonly');
      const store = tx.objectStore('sales_queue');
      const index = store.index('syncStatus');
      const req = index.count('PENDING');

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Obtiene la totalidad del historial local de ventas (Pendientes y Sincronizadas).
   */
  async getAllSales(): Promise<QueuedSale[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readonly');
      const store = tx.objectStore('sales_queue');
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as QueuedSale[];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Marca una venta como sincronizada con éxito con el servidor.
   */
  async markSaleAsSynced(saleId: string, serverResponse?: Partial<SaleReceipt>): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readwrite');
      const store = tx.objectStore('sales_queue');
      const getReq = store.get(saleId);

      getReq.onsuccess = () => {
        const sale = getReq.result as QueuedSale | undefined;
        if (!sale) {
          resolve();
          return;
        }

        const now = new Date().toISOString();
        sale.syncStatus = 'SYNCED';
        sale.syncedAt = now;
        sale.receipt.isOffline = false;
        sale.receipt.syncedAt = now;

        if (serverResponse?.invoiceNumber) {
          sale.receipt.invoiceNumber = serverResponse.invoiceNumber;
        }

        const putReq = store.put(sale);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });

    await this.logSyncEvent('SYNC_SUCCESS', `Venta local ${saleId} sincronizada exitosamente con el servidor.`);
  }

  /**
   * Registra un fallo de sincronización con contador de intentos.
   */
  async markSaleAsFailed(saleId: string, errorMessage: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readwrite');
      const store = tx.objectStore('sales_queue');
      const getReq = store.get(saleId);

      getReq.onsuccess = () => {
        const sale = getReq.result as QueuedSale | undefined;
        if (!sale) {
          resolve();
          return;
        }

        sale.syncStatus = 'FAILED';
        sale.attempts = (sale.attempts || 0) + 1;
        sale.lastAttemptAt = new Date().toISOString();
        sale.errorLog = errorMessage;

        const putReq = store.put(sale);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });

    await this.logSyncEvent('SYNC_FAILED', `Error sincronizando venta ${saleId}: ${errorMessage}`);
  }

  /**
   * Reintenta marcar una venta fallida como PENDING para volver a procesarla.
   */
  async retrySale(saleId: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales_queue', 'readwrite');
      const store = tx.objectStore('sales_queue');
      const getReq = store.get(saleId);

      getReq.onsuccess = () => {
        const sale = getReq.result as QueuedSale | undefined;
        if (!sale) {
          resolve();
          return;
        }
        sale.syncStatus = 'PENDING';
        sale.errorLog = undefined;
        const putReq = store.put(sale);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Almacena en caché el catálogo de productos en IndexedDB para búsquedas offline.
   */
  async cacheCatalog(products: PosCatalogProduct[]): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('catalog_cache', 'readwrite');
      const store = tx.objectStore('catalog_cache');
      for (const p of products) {
        store.put(p);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Obtiene el catálogo local desde IndexedDB para el POS en modo offline.
   */
  async getLocalCatalog(_branchId: string, search?: string): Promise<PosCatalogProduct[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('catalog_cache', 'readonly');
      const store = tx.objectStore('catalog_cache');
      const req = store.getAll();

      req.onsuccess = () => {
        let list = (req.result as PosCatalogProduct[]) || [];
        if (search && search.trim().length > 0) {
          const query = search.toLowerCase().trim();
          list = list.filter(
            p =>
              p.name.toLowerCase().includes(query) ||
              p.category.toLowerCase().includes(query) ||
              p.variants.some(v => v.sku.toLowerCase().includes(query) || v.barcode.includes(query))
          );
        }
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Búsqueda rápida de código de barras en el catálogo local de IndexedDB.
   */
  async lookupLocalBarcode(barcode: string, branchId: string): Promise<PosCartItem | null> {
    const products = await this.getLocalCatalog(branchId);
    for (const p of products) {
      const v = p.variants.find(item => item.barcode === barcode || item.sku === barcode);
      if (v) {
        return {
          variantId: v.variantId,
          sku: v.sku,
          barcode: v.barcode,
          garmentName: p.name,
          sizeName: v.sizeName,
          colorName: v.colorName,
          unitPrice: v.price,
          quantity: 1,
          subtotal: v.price,
          maxAvailableStock: v.availableStock,
          isFromReservation: false,
        };
      }
    }
    return null;
  }

  /**
   * Descuenta stock en la caché local de IndexedDB cuando se vende offline.
   */
  async decrementLocalStock(branchId: string, variantId: string, quantity: number): Promise<void> {
    const db = await this.getDB();
    const cacheKey = `${branchId}_${variantId}`;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('inventory_cache', 'readwrite');
      const store = tx.objectStore('inventory_cache');
      const getReq = store.get(cacheKey);

      getReq.onsuccess = () => {
        const item = getReq.result as LocalInventoryStock | undefined;
        const currentStock = item ? item.availableStock : 10;
        const newStock = Math.max(0, currentStock - quantity);

        const updatedItem: LocalInventoryStock = {
          cacheKey,
          branchId,
          variantId,
          availableStock: newStock,
          lastUpdated: new Date().toISOString(),
        };

        store.put(updatedItem);
        resolve();
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Registra un evento en el log de auditoría de sincronización.
   */
  async logSyncEvent(event: SyncAuditLog['event'], details: string, count?: number): Promise<void> {
    try {
      const db = await this.getDB();
      const entry: SyncAuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        event,
        details,
        count,
      };

      const tx = db.transaction('sync_audit_log', 'readwrite');
      tx.objectStore('sync_audit_log').put(entry);
    } catch {
      // Ignorar errores no críticos de auditoría
    }
  }

  /**
   * Obtiene los últimos logs de auditoría de sincronización.
   */
  async getAuditLogs(limit: number = 50): Promise<SyncAuditLog[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_audit_log', 'readonly');
      const store = tx.objectStore('sync_audit_log');
      const req = store.getAll();

      req.onsuccess = () => {
        const logs = (req.result as SyncAuditLog[]) || [];
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(logs.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Exporta un volcado JSON de todas las ventas para respaldo de emergencia.
   */
  async exportEmergencyBackupJson(): Promise<string> {
    const allSales = await this.getAllSales();
    const auditLogs = await this.getAuditLogs(100);
    const backup = {
      exportedAt: new Date().toISOString(),
      database: DB_NAME,
      version: DB_VERSION,
      salesCount: allSales.length,
      pendingCount: allSales.filter(s => s.syncStatus === 'PENDING').length,
      sales: allSales,
      auditLogs,
    };
    return JSON.stringify(backup, null, 2);
  }
}

export const offlinePosDb = new OfflinePosDatabase();
