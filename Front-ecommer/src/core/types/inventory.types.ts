export type StockMovementType = 
  | 'INCOMING_BATCH' 
  | 'SALE' 
  | 'RESERVATION_HOLD' 
  | 'RESERVATION_RELEASE' 
  | 'TRANSFER' 
  | 'ADJUSTMENT';

export type AdjustmentReason = 
  | 'MERMA_DANIO' 
  | 'DISCREPANCIA_AUDITORIA' 
  | 'DEVOLUCION_PROVEEDOR' 
  | 'CORRECCION_INGRESO';

export interface BranchStockItem {
  id: string;
  branchId: string;
  branchName: string;
  variantId: string;
  sku: string;
  barcode: string;
  garmentName: string;
  sizeName: string;
  colorName: string;
  category: string;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  minAlertThreshold: number;
}

export interface StockAdjustmentPayload {
  branchId: string;
  variantId: string;
  newQuantity: number;
  reason: AdjustmentReason;
  comment: string;
}

export interface StockTransferPayload {
  originBranchId: string;
  destinationBranchId: string;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  transferCode: string;
  originBranchName: string;
  destinationBranchName: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  itemsCount: number;
  createdAt: string;
  receivedAt?: string;
}
