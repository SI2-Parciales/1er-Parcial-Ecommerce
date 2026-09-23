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
    return mockDb.createAdjustment(payload);
  },

  async createTransfer(payload: StockTransferPayload): Promise<StockTransfer> {
    return mockDb.createTransfer(payload);
  },

  async getTransfers(branchId?: string): Promise<StockTransfer[]> {
    return mockDb.getTransfers(branchId);
  },

  async receiveTransfer(transferId: string): Promise<void> {
    return mockDb.receiveTransfer(transferId);
  }
};
