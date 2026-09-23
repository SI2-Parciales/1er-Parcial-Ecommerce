import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Trash2, Plus, Minus } from 'lucide-react-native';
import type { CartItem } from '../tipos/cart.types';

export interface FilaItemCarritoProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const FilaItemCarrito: React.FC<FilaItemCarritoProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  return (
    <View className="bg-white p-3.5 rounded-2xl border border-gray-200 flex-row items-center justify-between shadow-xs mb-2.5">
      <Image
        source={{ uri: item.imageUrl }}
        className="w-16 h-16 rounded-xl bg-gray-100 mr-3"
        resizeMode="cover"
      />

      <View className="flex-1 pr-2">
        <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-[11px] text-gray-500 mt-0.5">
          {item.sizeName} • {item.colorName}
        </Text>
        <Text className="text-xs font-black text-gray-900 mt-1">
          Bs. {item.price.toFixed(2)}
        </Text>
      </View>

      {/* Quantity Controls */}
      <View className="items-end gap-2">
        <TouchableOpacity onPress={onRemove} className="p-1">
          <Trash2 size={15} color="#9CA3AF" />
        </TouchableOpacity>

        <View className="flex-row items-center bg-gray-100 rounded-lg px-2 py-1 gap-2">
          <TouchableOpacity onPress={() => onUpdateQuantity(item.quantity - 1)}>
            <Minus size={12} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xs font-bold text-gray-900 min-w-4 text-center">
            {item.quantity}
          </Text>
          <TouchableOpacity onPress={() => onUpdateQuantity(item.quantity + 1)}>
            <Plus size={12} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
