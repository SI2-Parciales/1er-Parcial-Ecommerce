import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { ArrowLeft, Trash2, Calendar, Clock, Store, Check, Sparkles } from 'lucide-react-native';
import { useFittingBagStore } from '../almacen/fittingBag.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { ReservationPassModal } from '../componentes/ReservationPassModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import type { ClientReservation } from '../tipos/reservation.types';

type Props = NativeStackScreenProps<RootStackParamList, 'FittingBag'>;

const TIME_SLOTS = [
  '10:00 - 10:30',
  '11:30 - 12:00',
  '14:00 - 14:30',
  '15:30 - 16:00',
  '17:00 - 17:30',
  '18:30 - 19:00',
];

export const FittingBagScreen: React.FC<Props> = ({ navigation }) => {
  const { items, removeItem, confirmReservation } = useFittingBagStore();
  const { activeBranch } = useBranchStore();

  const [selectedDate, setSelectedDate] = useState('Hoy');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[3]);
  const [createdPass, setCreatedPass] = useState<ClientReservation | null>(null);

  const handleConfirm = () => {
    if (items.length === 0) {
      Alert.alert('Bolsa Vacía', 'Agrega al menos una prenda para agendar tu probador.');
      return;
    }

    const reservation = confirmReservation(activeBranch.id, activeBranch.name, activeBranch.address);
    setCreatedPass(reservation);
  };

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      {/* Top Bar */}
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-sm font-bold text-gray-900">
            Bolsa de Probador
          </Text>
          <Text className="text-[11px] font-semibold text-blue-600">
            {items.length} / 5 prendas seleccionadas
          </Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView style={{ flex: 1 }} className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Capacidad / Cupo Bar */}
        <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-xs">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-gray-800">
              Cupo de Probador Inteligente
            </Text>
            <Text className="text-xs font-black text-blue-600">
              {items.length} de 5 prendas
            </Text>
          </View>
          <View className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <View
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(items.length / 5) * 100}%` }}
            />
          </View>
          <Text className="text-[10px] text-gray-400 mt-2">
            Regla de tienda: máximo 5 prendas por cita para agilidad en probadores físicos.
          </Text>
        </View>

        {/* Selected Items */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
            Prendas a Probar
          </Text>

          {items.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-gray-200 items-center">
              <Text className="text-xs text-gray-500 font-medium">Tu bolsa de probador está vacía.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-gray-200 mb-2.5 flex-row items-center justify-between shadow-xs"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Image
                    source={{ uri: item.imageUrl }}
                    className="w-14 h-14 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Talla: {item.sizeName} • Color: {item.colorName}
                    </Text>
                    <Text className="text-xs font-black text-gray-900 mt-1">
                      Bs. {item.price.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  className="p-2 bg-red-50 rounded-xl"
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Cita y Horario */}
        <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-5 shadow-xs">
          <View className="flex-row items-center gap-2 mb-3">
            <Clock size={16} color="#2563EB" />
            <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Seleccionar Horario de Cita (Turnos de 30 min)
            </Text>
          </View>

          {/* Date Selector */}
          <View className="flex-row gap-2 mb-3">
            {['Hoy', 'Mañana', 'Pasado mañana'].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDate(d)}
                className={`flex-1 py-2 rounded-xl items-center border ${
                  selectedDate === d ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-xs font-bold ${selectedDate === d ? 'text-white' : 'text-gray-700'}`}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Slots Grid */}
          <View className="flex-row flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  className={`px-3 py-2 rounded-xl border ${
                    isSelected ? 'bg-blue-50 border-blue-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Branch indicator */}
        <View className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-8 flex-row items-center gap-3">
          <Store size={20} color="#2563EB" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-blue-900">
              Sucursal de Prueba: {activeBranch.name}
            </Text>
            <Text className="text-[11px] text-blue-700">
              {activeBranch.address}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Confirmation Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={items.length === 0}
          className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-md ${
            items.length > 0 ? 'bg-blue-600 shadow-blue-500/30' : 'bg-gray-300'
          }`}
        >
          <Text className="text-white font-bold text-sm">
            Confirmar Reserva Pick & Try
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Pase QR */}
      <ReservationPassModal
        visible={!!createdPass}
        reservation={createdPass}
        onClose={() => {
          setCreatedPass(null);
          navigation.navigate('MainTabs', { screen: 'ReservationsTab' });
        }}
      />
    </ScreenContainer>
  );
};
