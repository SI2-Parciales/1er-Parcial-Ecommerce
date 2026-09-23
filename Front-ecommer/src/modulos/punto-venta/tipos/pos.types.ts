export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QR_TRANSFER';

export interface PosCartItem {
  variantId: string;
  sku: string;
  barcode: string;
  garmentName: string;
  sizeName: string;
  colorName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  maxAvailableStock: number;
  isFromReservation: boolean;
}

export interface CustomerBillingData {
  taxId: string;        // NIT o C.I.
  businessName: string; // Razón Social o Nombre
  email?: string;
}

export interface ProcessSalePayload {
  branchId: string;
  cashierId: string;
  reservationId?: string;
  customer: CustomerBillingData;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    isFromReservation: boolean;
  }>;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface SaleReceipt {
  saleId: string;
  invoiceNumber: string; // Ej: "FAC-SCZ01-0004521"
  branchCode: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  cashierName: string;
  issuedAt: string;
  customer: CustomerBillingData;
  items: PosCartItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  qrSecurityCode?: string; // Código QR de control tributario
  isOffline?: boolean;
  offlineInvoiceNumber?: string;
  syncedAt?: string;
}

// Quick catalog item for POS touch grid
export interface PosCatalogProduct {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  imageUrl?: string;
  totalStockInBranch: number;
  variants: Array<{
    variantId: string;
    sku: string;
    barcode: string;
    sizeName: string;
    colorName: string;
    price: number;
    availableStock: number;
  }>;
}
