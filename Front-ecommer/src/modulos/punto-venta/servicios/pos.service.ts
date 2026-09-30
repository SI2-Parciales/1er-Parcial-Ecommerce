import type { 
  PosCartItem, 
  PosCatalogProduct, 
  ProcessSalePayload, 
  SaleReceipt,
  PaymentMethod
} from '../tipos/pos.types';
import { apiClient } from '@core/http/api-client';
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
      const response = await apiClient.get<any>('/productos', { params: { limite: 100 } });
      const rawProducts = response.data?.data || response.data;
      if (Array.isArray(rawProducts)) {
        for (const p of rawProducts) {
          for (const v of p.variantes || []) {
            const code = `777000${v.id}`;
            if (code === barcode || v.sku === barcode || String(v.id) === barcode) {
              const numBranchId = parseInt(branchId.replace(/\D/g, ''), 10) || 1;
              const inv = (v.inventarios || []).find((i: any) => i.sucursalId === numBranchId);
              const stock = inv ? Math.max(0, (inv.cantidadFisica || 0) - (inv.cantidadNoDisponible || 0)) : 10;
              return {
                variantId: String(v.id),
                sku: v.sku || `SKU-${v.id}`,
                barcode: code,
                garmentName: p.nombre,
                sizeName: v.talla?.nombre || 'M',
                colorName: v.color?.nombre || 'Predeterminado',
                unitPrice: Number(p.precio) || 0,
                quantity: 1,
                subtotal: Number(p.precio) || 0,
                maxAvailableStock: stock,
                isFromReservation: false,
              };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Error al buscar código de barras en backend:', err?.message);
    }

    const fallbackLocal = await offlinePosDb.lookupLocalBarcode(barcode, branchId);
    if (fallbackLocal) {
      return fallbackLocal;
    }
    throw new Error(`Prenda no encontrada para el código: ${barcode}`);
  },

  /**
   * Obtiene el catálogo rápido para la grilla táctil conectado al backend.
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
      const response = await apiClient.get<any>('/productos', { params: { limite: 100, buscar: search } });
      const rawProducts = response.data?.data || response.data;
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        const numBranchId = parseInt(branchId.replace(/\D/g, ''), 10) || 1;
        const catalog: PosCatalogProduct[] = rawProducts.map((p: any) => {
          const variants = (p.variantes || []).map((v: any) => {
            const inv = (v.inventarios || []).find((i: any) => i.sucursalId === numBranchId);
            const stock = inv ? Math.max(0, (inv.cantidadFisica || 0) - (inv.cantidadNoDisponible || 0)) : 10;
            return {
              variantId: String(v.id),
              sku: v.sku || `SKU-${v.id}`,
              barcode: `777000${v.id}`,
              sizeName: v.talla?.nombre || 'M',
              colorName: v.color?.nombre || 'Predeterminado',
              price: Number(p.precio) || 0,
              availableStock: stock,
            };
          });

          const totalStock = variants.reduce((acc: number, v: any) => acc + v.availableStock, 0);

          return {
            id: String(p.id),
            name: p.nombre,
            category: p.categoria?.nombre || 'Ropa Casual',
            basePrice: Number(p.precio) || 0,
            imageUrl: p.imagenUrl || undefined,
            totalStockInBranch: totalStock,
            variants,
          };
        });

        if (catalog && catalog.length > 0) {
          offlinePosDb.cacheCatalog(catalog).catch(() => {});
        }
        return catalog;
      }
    } catch (err: any) {
      console.warn('Backend /productos en POS no disponible, usando IndexedDB:', err?.message);
    }
    return offlinePosDb.getLocalCatalog(branchId, search);
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
      // 1. Registrar venta presencial en backend real
      const salePayload = {
        nombreFacturacion: payload.customer?.businessName || 'CONSUMIDOR FINAL',
        documentoFacturacion: payload.customer?.taxId || '0',
        detalles: payload.items.map((it) => {
          const numId = parseInt(it.variantId.replace(/\D/g, ''), 10);
          return {
            varianteProductoId: !isNaN(numId) && numId > 0 ? numId : 1,
            cantidad: it.quantity,
          };
        }),
      };

      const saleRes = await apiClient.post<any>('/ventas/presenciales', salePayload);
      const saleId = saleRes.data.id;

      // 2. Procesar pago en caja en backend real
      const metodoPago = payload.paymentMethod === 'CASH' 
        ? 'EFECTIVO' 
        : (payload.paymentMethod === 'QR_TRANSFER' ? 'QR' : 'TARJETA');
      
      const paymentRes = await apiClient.post<any>(`/ventas/${saleId}/pagos/caja`, {
        metodo: metodoPago,
        monto: payload.amountTendered || payload.totalAmount,
        montoRecibido: payload.amountTendered || payload.totalAmount,
        referencia: payload.paymentMethod === 'QR_TRANSFER' ? `QR-${Date.now()}` : `CAJA-${Date.now()}`,
      });

      // 3. Construir ticket fiscal
      const branchCode = payload.branchId.toUpperCase().replace('BRANCH-', 'SUC');
      const invoiceNumber = `FAC-${branchCode}-${String(saleId).padStart(6, '0')}`;

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
        // Usar predeterminados si local catalog no disponible
      }

      const receipt: SaleReceipt = {
        saleId: String(saleId),
        invoiceNumber,
        branchCode,
        branchName: saleRes.data.sucursal?.nombre || 'Sucursal Central',
        branchAddress: saleRes.data.sucursal?.ubicacion || 'Central',
        branchPhone: '+591 2 2441234',
        cashierName: `${saleRes.data.cajero?.nombre || ''} ${saleRes.data.cajero?.apellido || ''}`.trim() || 'Cajero en Turno',
        issuedAt: saleRes.data.fecha || new Date().toISOString(),
        customer: payload.customer,
        items: receiptItems,
        subtotal: payload.subtotal,
        taxAmount: payload.taxAmount,
        totalAmount: Number(saleRes.data.total) || payload.totalAmount,
        paymentMethod: payload.paymentMethod,
        amountTendered: payload.amountTendered,
        changeDue: paymentRes.data?.cambio ?? payload.changeDue,
        qrSecurityCode: `https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=${Date.now()}&numero=${invoiceNumber}&monto=${payload.totalAmount}&online=1`,
        isOffline: false,
      };

      // Guardar copia local en IndexedDB marcada como SYNCED
      await offlinePosDb.saveOfflineSale(payload, {
        ...receipt,
        isOffline: false,
        syncedAt: new Date().toISOString(),
      });
      await offlinePosDb.markSaleAsSynced(receipt.saleId);
      return receipt;
    } catch (netErr: any) {
      console.warn('Backend /ventas/presenciales no respondió, usando fallback local:', netErr?.message);
      try {
        const receipt = await mockDb.processSale(payload);
        await offlinePosDb.saveOfflineSale(payload, {
          ...receipt,
          isOffline: false,
          syncedAt: new Date().toISOString(),
        });
        await offlinePosDb.markSaleAsSynced(receipt.saleId);
        return receipt;
      } catch {
        return this.processOfflineSale(payload);
      }
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
  },

  /**
   * Obtener todas las ventas registradas para auditoría e historial.
   */
  async getAllSales(): Promise<SaleReceipt[]> {
    try {
      const response = await apiClient.get<any>('/ventas', { params: { limit: 100 } });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map((s: any): SaleReceipt => {
          const pago = s.pagos?.[0];
          const metodo = pago?.metodo;
          const paymentMethod: PaymentMethod = 
            metodo === 'EFECTIVO' ? 'CASH' : (metodo === 'QR' ? 'QR_TRANSFER' : 'DEBIT_CARD');
          return {
            saleId: String(s.id),
            invoiceNumber: `FAC-${(s.sucursal?.nombre || 'SUC').slice(0, 3).toUpperCase()}-${String(s.id).padStart(6, '0')}`,
            branchCode: `SUC-00${s.sucursal?.id || 1}`,
            branchName: s.sucursal?.nombre || 'Sucursal Central',
            branchAddress: s.sucursal?.ubicacion || 'Central',
            branchPhone: '+591 2 2441234',
            cashierName: `${s.cajero?.nombre || ''} ${s.cajero?.apellido || ''}`.trim() || 'Cajero',
            issuedAt: s.fecha || new Date().toISOString(),
            customer: {
              taxId: s.documentoFacturacion || '0',
              businessName: s.nombreFacturacion || 'CONSUMIDOR FINAL',
            },
            items: (s.detalles || []).map((d: any) => ({
              variantId: String(d.variante?.id || d.id),
              sku: d.variante?.sku || `SKU-${d.id}`,
              barcode: `777000${d.variante?.id || d.id}`,
              garmentName: d.variante?.producto?.nombre || 'Prenda Fashion',
              sizeName: d.variante?.talla?.nombre || 'M',
              colorName: d.variante?.color?.nombre || 'Estándar',
              unitPrice: Number(d.precioUnitario) || 0,
              quantity: d.cantidad,
              subtotal: Number(d.subtotal) || 0,
              maxAvailableStock: 0,
              isFromReservation: false,
            })),
            subtotal: Number(s.total) || 0,
            taxAmount: 0,
            totalAmount: Number(s.total) || 0,
            paymentMethod,
            amountTendered: pago?.montoRecibido != null ? Number(pago.montoRecibido) : Number(s.total),
            changeDue: pago?.cambio != null ? Number(pago.cambio) : 0,
            isOffline: false,
          };
        });
      }
    } catch (err: any) {
      console.warn('Backend /ventas no disponible, usando fallback:', err.message);
    }
    return mockDb.getAllSales();
  }
};
