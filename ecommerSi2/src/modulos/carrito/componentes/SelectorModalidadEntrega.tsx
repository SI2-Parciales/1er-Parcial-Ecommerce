import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Store, Truck } from 'lucide-react-native';
import type { DeliveryType } from '../tipos/cart.types';

export interface SelectorModalidadEntregaProps {
  deliveryType: DeliveryType;
  onSelectDeliveryType: (type: DeliveryType) => void;
  branchName: string;
  branchAddress: string;
}

export const SelectorModalidadEntrega: React.FC<SelectorModalidadEntregaProps> = ({
  deliveryType,
  onSelectDeliveryType,
  branchName,
  branchAddress,
}) => {
  return (
    <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-xs">
      <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
        Modalidad de Entrega
      </Text>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => onSelectDeliveryType('PICKUP_IN_STORE')}
          className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
            deliveryType === 'PICKUP_IN_STORE'
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Store size={18} color={deliveryType === 'PICKUP_IN_STORE' ? '#2563EB' : '#6B7280'} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-gray-900">Recojo Tienda</Text>
            <Text className="text-[10px] text-gray-500">Gratis en sucursal</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectDeliveryType('HOME_DELIVERY')}
          className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
            deliveryType === 'HOME_DELIVERY'
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Truck size={18} color={deliveryType === 'HOME_DELIVERY' ? '#2563EB' : '#6B7280'} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-gray-900">Envío Express</Text>
            <Text className="text-[10px] text-gray-500">+Bs. 20.00</Text>
          </View>
        </TouchableOpacity>
      </View>

      {deliveryType === 'PICKUP_IN_STORE' && (
        <Text className="text-[11px] text-blue-700 font-medium mt-2.5">
          Listo para recoger en: <Text className="font-bold">{branchName}</Text> ({branchAddress})
        </Text>
      )}
    </View>
  );
};
