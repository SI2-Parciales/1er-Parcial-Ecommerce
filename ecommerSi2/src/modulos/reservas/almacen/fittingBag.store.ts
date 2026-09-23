import { create } from 'zustand';
import { appStorage } from '@shared/storage/mmkv';
import type { FittingBagItem, ClientReservation } from '../tipos/reservation.types';

interface FittingBagState {
  items: FittingBagItem[];
  selectedDate: string;
  selectedTimeSlot: string;
  reservations: ClientReservation[];
  addItem: (item: FittingBagItem) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  clearBag: () => void;
  setTimeSlot: (date: string, slot: string) => void;
  confirmReservation: (branchId: string, branchName: string, branchAddress: string) => ClientReservation;
  cancelReservation: (id: string) => void;
}

export const useFittingBagStore = create<FittingBagState>((set, get) => {
  const savedItems = appStorage.getObject<FittingBagItem[]>('fitting_bag_items') || [];
  const savedReservations = appStorage.getObject<ClientReservation[]>('client_reservations') || [];

  return {
    items: savedItems,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedTimeSlot: '15:30 - 16:00',
    reservations: savedReservations,

    addItem: (item) => {
      const current = get().items;
      if (current.length >= 5) {
        return {
          success: false,
          message: 'Límite de probador alcanzado (máximo 5 prendas por turno)',
        };
      }
      const updated = [...current, item];
      appStorage.setObject('fitting_bag_items', updated);
      set({ items: updated });
      return { success: true };
    },

    removeItem: (id) => {
      const updated = get().items.filter(it => it.id !== id);
      appStorage.setObject('fitting_bag_items', updated);
      set({ items: updated });
    },

    clearBag: () => {
      appStorage.setObject('fitting_bag_items', []);
      set({ items: [] });
    },

    setTimeSlot: (selectedDate, selectedTimeSlot) => {
      set({ selectedDate, selectedTimeSlot });
    },

    confirmReservation: (branchId, branchName, branchAddress) => {
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const code = `RES-${codeNum}`;
      const newReservation: ClientReservation = {
        id: `res-${Date.now()}`,
        reservationCode: code,
        branchId,
        branchName,
        branchAddress,
        scheduledTime: `${get().selectedDate} ${get().selectedTimeSlot}`,
        status: 'PENDING',
        items: [...get().items],
        createdAt: new Date().toISOString(),
        qrPayload: JSON.stringify({
          code,
          branchId,
          itemsCount: get().items.length,
          time: `${get().selectedDate} ${get().selectedTimeSlot}`,
        }),
      };

      const updatedReservations = [newReservation, ...get().reservations];
      appStorage.setObject('client_reservations', updatedReservations);
      appStorage.setObject('fitting_bag_items', []);

      set({
        reservations: updatedReservations,
        items: [],
      });

      return newReservation;
    },

    cancelReservation: (id) => {
      const updated = get().reservations.map(r =>
        r.id === id ? { ...r, status: 'CANCELLED' as const } : r
      );
      appStorage.setObject('client_reservations', updated);
      set({ reservations: updated });
    },
  };
});
