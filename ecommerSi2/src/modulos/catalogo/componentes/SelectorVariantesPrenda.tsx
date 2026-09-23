import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { ProductVariant } from '../tipos/catalog.types';

export interface SelectorVariantesPrendaProps {
  variants: ProductVariant[];
  selectedVariantIndex: number;
  onSelectVariant: (index: number) => void;
}

export const SelectorVariantesPrenda: React.FC<SelectorVariantesPrendaProps> = ({
  variants,
  selectedVariantIndex,
  onSelectVariant,
}) => {
  return (
    <View className="mt-6">
      <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">
        Colores y Tallas Disponibles
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {variants.map((variant, index) => {
          const isSelected = index === selectedVariantIndex;
          return (
            <TouchableOpacity
              key={variant.id}
              onPress={() => onSelectVariant(index)}
              activeOpacity={0.8}
              className={`flex-row items-center px-3 py-2 rounded-xl border ${
                isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <View
                className="w-3.5 h-3.5 rounded-full mr-2 border border-gray-300"
                style={{ backgroundColor: variant.colorHex }}
              />
              <Text className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                {variant.colorName} - {variant.sizeName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
