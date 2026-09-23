import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CalendarClock, ShoppingBag } from 'lucide-react-native';

export interface BarraAccionesDetalleProps {
  onAddToFitting: () => void;
  onAddToCart: () => void;
}

export const BarraAccionesDetalle: React.FC<BarraAccionesDetalleProps> = ({
  onAddToFitting,
  onAddToCart,
}) => {
  return (
    <View className="p-4 border-t border-gray-100 bg-white flex-row gap-2.5">
      <TouchableOpacity
        onPress={onAddToFitting}
        activeOpacity={0.8}
        className="flex-1 bg-gray-900 py-3.5 rounded-xl items-center justify-center flex-row gap-1.5 shadow-xs"
      >
        <CalendarClock size={16} color="#FFFFFF" />
        <Text className="text-white font-bold text-xs">
          Reservar Probador
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAddToCart}
        activeOpacity={0.8}
        className="flex-1 bg-blue-600 py-3.5 rounded-xl items-center justify-center flex-row gap-1.5 shadow-md shadow-blue-500/30"
      >
        <ShoppingBag size={16} color="#FFFFFF" />
        <Text className="text-white font-bold text-xs">
          Añadir a la Bolsa
        </Text>
      </TouchableOpacity>
    </View>
  );
};
