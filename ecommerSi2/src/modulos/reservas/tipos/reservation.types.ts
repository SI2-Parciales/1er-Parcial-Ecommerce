export interface FittingBagItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  sizeName: string;
  colorName: string;
  colorHex: string;
  price: number;
  imageUrl: string;
}

export interface ClientReservation {
  id: string;
  reservationCode: string; // "RES-XXXX"
  branchId: string;
  branchName: string;
  branchAddress: string;
  scheduledTime: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CLIENT_PRESENT' | 'COMPLETED' | 'CANCELLED';
  items: FittingBagItem[];
  createdAt: string;
  qrPayload: string;
}
