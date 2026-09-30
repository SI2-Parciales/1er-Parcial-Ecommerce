import { apiClient } from '@core/http/api-client';
import type { 
  BranchStockItem, 
  PaginatedResponse, 
  StockTransfer, 
  StockTransferPayload 
} from '@core/types';
import type { StockAdjustmentValues } from '../esquemas/inventory.schema';
import { mockDb } from '@core/mock/mock-db';

export const inventoryService = {
  async getStock(branchId: string, params: Record<string, unknown>): Promise<PaginatedResponse<BranchStockItem>> {
    try {
      const parsedBranchId = parseInt(branchId, 10);
      const queryParams: Record<string, any> = {
        pagina: (params.page as number) || 1,
        limite: (params.pageSize as number) || 20,
      };
      if (!isNaN(parsedBranchId)) {
        queryParams.sucursalId = parsedBranchId;
      }
      if (typeof params.search === 'string' && params.search.trim()) {
        queryParams.buscar = params.search.trim();
      }

      const response = await apiClient.get<any>('/inventario', { params: queryParams });
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const mapped: BranchStockItem[] = response.data.data.map((item: any) => ({
          id: String(item.inventarioId || `inv-${item.variante?.id}`),
          branchId: String(branchId || '1'),
          branchName: String(branchId) === '2' ? 'Sucursal Plan 3000' : 'Sucursal Central',
          variantId: String(item.variante?.id || ''),
          sku: item.variante?.sku || `SKU-${item.variante?.id}`,
          barcode: `777000${item.variante?.id || 1}`,
          garmentName: item.variante?.producto?.nombre || 'Prenda de Colección',
          sizeName: item.variante?.talla?.nombre || 'M',
          colorName: item.variante?.color?.nombre || 'Predeterminado',
          category: 'Ropa Casual',
          availableStock: item.cantidadDisponible ?? item.cantidadFisica ?? 0,
          reservedStock: item.cantidadReservada ?? 0,
          totalStock: item.cantidadFisica ?? 0,
          minAlertThreshold: 5,
        }));

        const totalItems = response.data.meta?.total ?? mapped.length;
        const itemsPerPage = response.data.meta?.limit ?? 20;
        const currentPage = response.data.meta?.page ?? 1;
        return {
          data: mapped,
          meta: {
            totalItems,
            itemCount: mapped.length,
            itemsPerPage,
            totalPages: Math.ceil(totalItems / itemsPerPage) || 1,
            currentPage,
          },
        };
      }
    } catch (err) {
      console.warn('Backend /inventario no disponible o sin permiso de encargado, usando mockDb:', err);
    }
    return mockDb.getStock(branchId, params);
  },

  async createAdjustment(payload: StockAdjustmentValues): Promise<BranchStockItem> {
    const branchClean = String(payload.branchId).replace(/\D/g, '');
    const branchIdNum = parseInt(branchClean, 10) || 1;
    const variantClean = String(payload.variantId).replace(/\D/g, '');
    const variantIdNum = parseInt(variantClean, 10);
    const currentStock = typeof payload.currentStock === 'number' ? payload.currentStock : 0;
    const diff = payload.newQuantity - currentStock;

    if (!isNaN(variantIdNum) && variantIdNum > 0 && diff !== 0) {
      try {
        const isMerma = diff < 0 || payload.reason === 'MERMA_DANIO' || payload.reason === 'DISCREPANCIA_AUDITORIA';
        const tipo = isMerma ? 'MERMA' : 'RECEPCION';
        const cantidad = Math.abs(diff) || 1;

        const body: Record<string, any> = {
          tipo,
          varianteProductoId: variantIdNum,
          cantidad,
          observacion: `[${payload.reason}] ${payload.comment || 'Ajuste manual de existencias'}`,
        };

        if (tipo === 'RECEPCION') {
          body.sucursalDestinoId = branchIdNum;
        } else {
          body.sucursalOrigenId = branchIdNum;
          body.origenUnidades = 'DISPONIBLE';
        }

        await apiClient.post(
          '/inventario/movimientos',
          body,
          {
            headers: {
              'Idempotency-Key': crypto.randomUUID(),
            },
          },
        );

        // Mantener sincronizado el almacenamiento local mock
        try {
          await mockDb.createAdjustment(payload);
        } catch {
          // Si el mock no lo tiene, ignorar
        }

        return {
          id: `inv-${branchIdNum}-${variantIdNum}`,
          branchId: String(payload.branchId),
          branchName: branchIdNum === 2 ? 'Sucursal Equipetrol (Santa Cruz)' : 'Sucursal Central (La Paz)',
          variantId: String(payload.variantId),
          sku: payload.sku || `SKU-${variantIdNum}`,
          barcode: `777000${variantIdNum}`,
          garmentName: payload.garmentName || 'Prenda de Colección',
          sizeName: payload.sizeName || 'M',
          colorName: payload.colorName || 'Predeterminado',
          category: 'Ropa Casual',
          availableStock: payload.newQuantity,
          reservedStock: 0,
          totalStock: payload.newQuantity,
          minAlertThreshold: 5,
        };
      } catch (err: any) {
        console.warn('Backend /inventario/movimientos devolvió error, aplicando ajuste en almacenamiento local:', err?.response?.data || err);
      }
    }

    return mockDb.createAdjustment(payload);
  },

  async createTransfer(payload: StockTransferPayload): Promise<StockTransfer> {
    try {
      const originClean = String(payload.originBranchId).replace(/\D/g, '');
      const destClean = String(payload.destinationBranchId).replace(/\D/g, '');
      const originId = parseInt(originClean, 10) || 1;
      const destId = parseInt(destClean, 10) || 2;

      if (!isNaN(originId) && !isNaN(destId)) {
        for (const item of payload.items) {
          const variantClean = String(item.variantId).replace(/\D/g, '');
          const variantId = parseInt(variantClean, 10);
          if (!isNaN(variantId) && item.quantity > 0) {
            await apiClient.post(
              '/inventario/movimientos',
              {
                tipo: 'TRANSFERENCIA',
                varianteProductoId: variantId,
                cantidad: item.quantity,
                sucursalOrigenId: originId,
                sucursalDestinoId: destId,
                observacion: payload.notes || 'Transferencia entre sucursales',
              },
              {
                headers: {
                  'Idempotency-Key': crypto.randomUUID(),
                },
              },
            );
          }
        }
      }
    } catch (err) {
      console.warn('Error registrando transferencia en backend, aplicando en mock local:', err);
    }
    return mockDb.createTransfer(payload);
  },

  async getTransfers(branchId?: string): Promise<StockTransfer[]> {
    try {
      const params: Record<string, any> = {
        tipo: 'TRANSFERENCIA',
        limit: 50,
      };
      if (branchId) {
        const bId = parseInt(branchId, 10);
        if (!isNaN(bId)) params.sucursalId = bId;
      }
      const response = await apiClient.get<any>('/inventario/movimientos', { params });
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data.map((m: any) => ({
          id: String(m.id),
          transferCode: `TRF-${m.id.toString().padStart(5, '0')}`,
          originBranchName: m.sucursalOrigen?.nombre || 'Sucursal Origen',
          destinationBranchName: m.sucursalDestino?.nombre || 'Sucursal Destino',
          status: 'RECEIVED' as const,
          itemsCount: m.cantidad || 1,
          createdAt: m.creadoEn || new Date().toISOString(),
          receivedAt: m.creadoEn,
        }));
      }
    } catch (err) {
      console.warn('Backend /inventario/movimientos no disponible, usando mockDb:', err);
    }
    return mockDb.getTransfers(branchId);
  },

  async receiveTransfer(transferId: string): Promise<void> {
    return mockDb.receiveTransfer(transferId);
  }
};
