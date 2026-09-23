import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { QrCode, Store, Calendar, CheckCircle2, X } from 'lucide-react-native';
import type { ClientReservation } from '../tipos/reservation.types';

interface Props {
  visible: boolean;
  reservation: ClientReservation | null;
  onClose: () => void;
}

export const ReservationPassModal: React.FC<Props> = ({ visible, reservation, onClose }) => {
  if (!reservation) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/60 p-5">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full z-10"
          >
            <X size={18} color="#4B5563" />
          </TouchableOpacity>

          <View className="items-center mb-4">
            <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center mb-2">
              <QrCode size={26} color="#2563EB" />
            </View>
            <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Pase Pick & Try Offline
            </Text>
            <Text className="text-xl font-black text-gray-900 mt-0.5 font-mono">
              {reservation.reservationCode}
            </Text>
          </View>

          {/* Simulated High-Res QR Pass Visual */}
          <View className="items-center justify-center p-5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl my-2">
            <View className="w-44 h-44 bg-white border border-gray-200 rounded-xl items-center justify-center p-3 shadow-inner">
              {/* Stylized QR representation */}
              <View className="w-full h-full border-4 border-gray-900 p-2 justify-between">
                <View className="flex-row justify-between">
                  <View className="w-8 h-8 bg-gray-900" />
                  <View className="w-8 h-8 bg-gray-900" />
                </View>
                <View className="items-center justify-center py-2">
                  <Text className="text-[11px] font-black font-mono tracking-widest text-center text-gray-900">
                    {reservation.reservationCode}
                  </Text>
                  <Text className="text-[8px] text-gray-400 mt-1 font-mono">
                    FASHIONSTORE SECURE PASS
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <View className="w-8 h-8 bg-gray-900" />
                  <View className="w-4 h-4 bg-blue-600 rounded-full self-end" />
                </View>
              </View>
            </View>
            <Text className="text-[10px] text-gray-400 mt-2 text-center">
              Muestra este código al llegar para ingresar a tu probador sin esperas.
            </Text>
          </View>

          {/* Details */}
          <View className="mt-4 space-y-2 text-xs">
            <View className="flex-row items-center gap-2">
              <Store size={14} color="#6B7280" />
              <Text className="text-xs text-gray-700 font-medium">
                {reservation.branchName}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Calendar size={14} color="#6B7280" />
              <Text className="text-xs text-gray-700 font-medium">
                Cita: {reservation.scheduledTime}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={14} color="#059669" />
              <Text className="text-xs text-emerald-600 font-bold">
                {reservation.items.length} prendas preparadas por el personal
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-full bg-gray-900 py-3 rounded-xl items-center mt-5"
          >
            <Text className="text-white text-xs font-bold">Cerrar Pase</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
