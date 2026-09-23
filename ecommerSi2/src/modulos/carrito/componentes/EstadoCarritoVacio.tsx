import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

export interface EstadoCarritoVacioProps {
  onGoToCatalog: () => void;
}

export const EstadoCarritoVacio: React.FC<EstadoCarritoVacioProps> = ({
  onGoToCatalog,
}) => {
  return (
    <View className="p-8 items-center justify-center bg-white rounded-2xl border border-gray-200 my-4 shadow-xs">
      <ShoppingBag size={44} color="#D1D5DB" />
      <Text className="text-sm font-bold text-gray-600 mt-3">
        Tu bolsa de compras está vacía
      </Text>
      <Text className="text-xs text-gray-400 mt-1 text-center">
        Explora nuestro catálogo exclusivo y añade tus prendas favoritas.
      </Text>
      <TouchableOpacity
        onPress={onGoToCatalog}
        activeOpacity={0.8}
        className="mt-4 px-4 py-2 bg-blue-600 rounded-xl shadow-xs"
      >
        <Text className="text-white text-xs font-bold">Ver Catálogo</Text>
      </TouchableOpacity>
    </View>
  );
};
