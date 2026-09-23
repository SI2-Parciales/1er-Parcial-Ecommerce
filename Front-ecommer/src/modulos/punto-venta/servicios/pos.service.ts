import type { 
  PosCartItem, 
  PosCatalogProduct, 
  ProcessSalePayload, 
  SaleReceipt 
} from '../tipos/pos.types';
import { mockDb } from '@core/mock/mock-db';
import { offlinePosDb } from '@core/offline/offlinePosDb';
import { useNetworkSyncStore } from '../ganchos/useNetworkSync';

export const posService = {
  /**
   * Búsqueda de código de barras: consulta la base de datos central o recurre a la caché local de IndexedDB.
   */
  async lookupBarcode(barcode: string, branchId: string): Promise<PosCartItem> {
    const isOfflineMode = (typeof navigator !== 'undefined' && !navigator.onLine) || 
                          useNetworkSyncStore.getState().isSimulatedOffline;

    if (isOfflineMode) {
      const localItem = await offlinePosDb.lookupLocalBarcode(barcode, branchId);
      if (localItem) {
        return localItem;
      }
    }

    try {
      const item = await mockDb.lookupBarcode(barcode, branchId);
      return item;
    } catch (err: any) {
      // Fallback a base de datos local si falla la llamada
      const fallbackLocal = await offlinePosDb.lookupLocalBarcode(barcode, branchId);
      if (fallbackLocal) {
        return fallbackLocal;
      }
      throw err;
    }
  },

  /**
   * Obtiene el catálogo rápido para la grilla táctil. Actualiza la caché local de IndexedDB en segundo plano.
   */
  async getQuickCatalog(branchId: string, search?: string): Promise<PosCatalogProduct[]> {
    const isOfflineMode = (typeof navigator !== 'undefined' && !navigator.onLine) || 
                          useNetworkSyncStore.getState().isSimulatedOffline;

    if (isOfflineMode) {
      const localCatalog = await offlinePosDb.getLocalCatalog(branchId, search);
      if (localCatalog && localCatalog.length > 0) {
        return localCatalog;
      }
    }

    try {
      const catalog = await mockDb.getQuickCatalog(branchId, search);
      // Guardar en la base de datos local IndexedDB para disponibilidad offline
      if (catalog && catalog.length > 0) {
        offlinePosDb.cacheCatalog(catalog).catch(() => {});
      }
      return catalog;
    } catch {
      // En caso de caída inesperada de red, servir desde IndexedDB
      return offlinePosDb.getLocalCatalog(branchId, search);
    }
  },

  /**
   * Procesa la venta:
   * - Si hay conexión: registra en el servidor central y guarda respaldo sincronizado en IndexedDB.
   * - Si no hay conexión (o falla la red): guarda atómicamente en IndexedDB como PENDING y emite recibo offline.
   */
  async processSale(payload: ProcessSalePayload): Promise<SaleReceipt> {
    const isOfflineMode = (typeof navigator !== 'undefined' && !navigator.onLine) || 
                          useNetworkSyncStore.getState().isSimulatedOffline;

    if (isOfflineMode) {
      return this.processOfflineSale(payload);
    }

    try {
      // Intento en línea
      const receipt = await mockDb.processSale(payload);
      // Guardar copia local en IndexedDB marcada como SYNCED
      await offlinePosDb.saveOfflineSale(payload, {
        ...receipt,
        isOffline: false,
        syncedAt: new Date().toISOString(),
      });
      await offlinePosDb.markSaleAsSynced(receipt.saleId);
      return receipt;
    } catch (netErr: any) {
      // Caída inesperada durante el cobro: interceptar y guardar en base de datos local
      console.warn('Fallo de conexión durante el cobro. Procediendo a registrar en base de datos local IndexedDB.', netErr);
      return this.processOfflineSale(payload);
    }
  },

  /**
   * Generación y almacenamiento atómico de venta fuera de línea en IndexedDB.
   */
  async processOfflineSale(payload: ProcessSalePayload): Promise<SaleReceipt> {
    const timeCode = Date.now().toString().slice(-6);
    const branchCode = payload.branchId.toUpperCase().replace('BRANCH-', 'SUC');
    const offlineInvoiceNumber = `FAC-${branchCode}-OFF-${timeCode}`;
    const saleId = `offline-sale-${Date.now()}`;

    // Construir items detallados para el ticket
    const receiptItems: PosCartItem[] = payload.items.map((it) => ({
      variantId: it.variantId,
      sku: `SKU-${it.variantId.slice(0, 8)}`,
      barcode: `770${it.variantId.replace(/\D/g, '').slice(0, 8).padEnd(8, '0')}`,
      garmentName: 'Prenda Fashion',
      sizeName: 'M',
      colorName: 'Estándar',
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: Math.round(it.quantity * it.unitPrice * 100) / 100,
      maxAvailableStock: 0,
      isFromReservation: it.isFromReservation,
    }));

    // Intentar hidratar nombres reales si están en el catálogo local
    try {
      const localCatalog = await offlinePosDb.getLocalCatalog(payload.branchId);
      for (const item of receiptItems) {
        for (const prod of localCatalog) {
          const v = prod.variants.find((vItem) => vItem.variantId === item.variantId);
          if (v) {
            item.garmentName = prod.name;
            item.sku = v.sku;
            item.barcode = v.barcode;
            item.sizeName = v.sizeName;
            item.colorName = v.colorName;
            break;
          }
        }
      }
    } catch {
      // Usar nombres predeterminados si la caché aún no está lista
    }

    const offlineReceipt: SaleReceipt = {
      saleId,
      invoiceNumber: offlineInvoiceNumber,
      branchCode,
      branchName: `Sucursal ${branchCode}`,
      branchAddress: 'Punto de Venta Local (Terminal Caja)',
      branchPhone: '+591 3 3456789',
      cashierName: 'Cajero en Turno',
      issuedAt: new Date().toISOString(),
      customer: payload.customer,
      items: receiptItems,
      subtotal: payload.subtotal,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      amountTendered: payload.amountTendered,
      changeDue: payload.changeDue,
      qrSecurityCode: `https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=${Date.now()}&numero=${offlineInvoiceNumber}&monto=${payload.totalAmount}&offline=1`,
      isOffline: true,
      offlineInvoiceNumber,
    };

    // Guardar en IndexedDB
    await offlinePosDb.saveOfflineSale(payload, offlineReceipt);

    return offlineReceipt;
  },

  /**
   * Obtener comprobante por ID (consulta local primero, luego central).
   */
  async getSaleReceipt(saleId: string): Promise<SaleReceipt> {
    const allLocal = await offlinePosDb.getAllSales();
    const foundLocal = allLocal.find((s) => s.id === saleId);
    if (foundLocal) {
      return foundLocal.receipt;
    }
    return mockDb.getSaleReceipt(saleId);
  }
};
