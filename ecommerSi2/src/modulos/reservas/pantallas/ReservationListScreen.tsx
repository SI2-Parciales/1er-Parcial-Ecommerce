import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { CalendarClock, QrCode, XCircle, Store, Clock, CheckCircle2 } from 'lucide-react-native';
import { useFittingBagStore } from '../almacen/fittingBag.store';
import { ReservationPassModal } from '../componentes/ReservationPassModal';
import type { ClientReservation } from '../tipos/reservation.types';

export const ReservationListScreen: React.FC = () => {
  const { reservations, cancelReservation } = useFittingBagStore();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedPass, setSelectedPass] = useState<ClientReservation | null>(null);

  const activeReservations = reservations.filter(r =>
    ['PENDING', 'PREPARING', 'READY', 'CLIENT_PRESENT'].includes(r.status)
  );

  const historyReservations = reservations.filter(r =>
    ['COMPLETED', 'CANCELLED'].includes(r.status)
  );

  const displayed = activeTab === 'ACTIVE' ? activeReservations : historyReservations;

  const handleCancel = (reservation: ClientReservation) => {
    Alert.alert(
      'Cancelar Reserva',
      `¿Estás seguro de cancelar tu turno ${reservation.reservationCode} en ${reservation.branchName}?`,
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => cancelReservation(reservation.id),
        },
      ]
    );
  };

  const getStatusBadge = (status: ClientReservation['status']) => {
    switch (status) {
      case 'PENDING':
        return <Text className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">En espera</Text>;
      case 'PREPARING':
        return <Text className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">En recolección</Text>;
      case 'READY':
        return <Text className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Listo en tienda</Text>;
      case 'CLIENT_PRESENT':
        return <Text className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">En probador</Text>;
      case 'COMPLETED':
        return <Text className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Completada</Text>;
      case 'CANCELLED':
        return <Text className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Cancelada</Text>;
    }
  };

  return (
    <ScreenContainer className="bg-gray-50/50">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-gray-100">
        <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Probador Inteligente
        </Text>
        <Text className="text-xl font-black text-gray-900 mt-0.5">
          Mis Citas Pick & Try
        </Text>

        {/* Tabs */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mt-4">
          <TouchableOpacity
            onPress={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'ACTIVE' ? 'bg-white shadow-xs' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'ACTIVE' ? 'text-gray-900' : 'text-gray-500'}`}>
              Activas ({activeReservations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'HISTORY' ? 'bg-white shadow-xs' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'HISTORY' ? 'text-gray-900' : 'text-gray-500'}`}>
              Historial ({historyReservations.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {displayed.length === 0 ? (
          <View className="p-8 items-center justify-center">
            <CalendarClock size={40} color="#D1D5DB" />
            <Text className="text-sm font-bold text-gray-500 mt-3 text-center">
              No tienes citas de probador {activeTab === 'ACTIVE' ? 'activas' : 'en el historial'}.
            </Text>
          </View>
        ) : (
          displayed.map((res) => (
            <View
              key={res.id}
              className="bg-white p-4 rounded-2xl border border-gray-200 mb-3 shadow-xs"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-base font-black text-gray-900 font-mono">
                    {res.reservationCode}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Store size={12} color="#6B7280" />
                    <Text className="text-xs text-gray-600 font-medium">{res.branchName}</Text>
                  </View>
                </View>
                {getStatusBadge(res.status)}
              </View>

              <View className="bg-gray-50 p-3 rounded-xl space-y-1 my-2">
                <View className="flex-row items-center gap-1.5 text-xs text-gray-600">
                  <Clock size={12} color="#2563EB" />
                  <Text className="text-xs text-gray-700">Horario: <Text className="font-bold text-gray-900">{res.scheduledTime}</Text></Text>
                </View>
                <Text className="text-xs text-gray-500">
                  {res.items.length} prendas apartadas en almacén
                </Text>
              </View>

              <View className="flex-row gap-2 mt-2 pt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => setSelectedPass(res)}
                  className="flex-1 bg-blue-600 py-2.5 rounded-xl items-center justify-center flex-row gap-1.5"
                >
                  <QrCode size={14} color="#FFFFFF" />
                  <Text className="text-white font-bold text-xs">Ver Pase QR</Text>
                </TouchableOpacity>

                {res.status === 'PENDING' && (
                  <TouchableOpacity
                    onPress={() => handleCancel(res)}
                    className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl items-center justify-center flex-row gap-1"
                  >
                    <XCircle size={14} color="#DC2626" />
                    <Text className="text-red-600 font-bold text-xs">Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Pase QR */}
      <ReservationPassModal
        visible={!!selectedPass}
        reservation={selectedPass}
        onClose={() => setSelectedPass(null)}
      />
    </ScreenContainer>
  );
};
