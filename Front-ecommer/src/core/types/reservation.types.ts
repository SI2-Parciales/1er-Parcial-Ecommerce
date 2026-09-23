export type ReservationStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface ReservationItem {
  id: string;
  variantId: string;
  quantity: number;
}

export interface FittingRoomReservation {
  id: string;
  code: string;
  customerId: string;
  branchId: string;
  status: ReservationStatus;
  items: ReservationItem[];
  scheduledAt: string;
  createdAt: string;
}
