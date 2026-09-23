// import { apiClient } from '@core/http/api-client';
import type { FittingRoomReservation, UpdateReservationStatusPayload } from '../tipos/reservation.types';
import type { PaginatedResponse } from '@core/types/api.types';
import { mockDb } from '@core/mock/mock-db';

export const reservationService = {
  async getReservations(branchId: string, date?: string): Promise<PaginatedResponse<FittingRoomReservation>> {
    // Modo Offline con Base de Datos Mock
    return mockDb.getReservations(branchId, date);

    /* Endpoints reales comentados temporalmente (sin backend):
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const response = await apiClient.get(`/branches/${branchId}/reservations`, { params });
    return response.data;
    */
  },

  async getReservationByCode(branchId: string, code: string): Promise<FittingRoomReservation> {
    // Modo Offline con Base de Datos Mock
    return mockDb.getReservationByCode(branchId, code);

    /* Endpoints reales comentados temporalmente (sin backend):
    const response = await apiClient.get(`/branches/${branchId}/reservations/code/${code}`);
    return response.data;
    */
  },

  async updateStatus(reservationId: string, payload: UpdateReservationStatusPayload): Promise<FittingRoomReservation> {
    // Modo Offline con Base de Datos Mock
    return mockDb.updateReservationStatus(reservationId, payload);

    /* Endpoints reales comentados temporalmente (sin backend):
    const response = await apiClient.patch(`/reservations/${reservationId}/status`, payload);
    return response.data;
    */
  }
};
