export type ReservationStatus = 
  | 'PENDING' 
  | 'PREPARING' 
  | 'READY' 
  | 'CLIENT_PRESENT' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'EXPIRED';

export interface ReservationItem {
  id: string;
  variantId: string;
  sku: string;
  barcode: string;
  garmentName: string;
  sizeName: string;
  colorName: string;
  price: number;
  imageUrl: string;
  isPurchased?: boolean;
}

export interface FittingRoomReservation {
  id: string;
  reservationCode: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  branchId: string;
  branchName: string;
  scheduledTime: string;
  status: ReservationStatus;
  items: ReservationItem[];
  notes?: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateReservationStatusPayload {
  status: ReservationStatus;
  notes?: string;
}
