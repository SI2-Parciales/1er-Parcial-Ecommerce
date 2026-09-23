import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export interface SugerenciasRapidasChipsProps {
  chips: string[];
  onSelectChip: (query: string) => void;
}

export const SugerenciasRapidasChips: React.FC<SugerenciasRapidasChipsProps> = ({
  chips,
  onSelectChip,
}) => {
  return (
    <View className="py-2.5 bg-white border-b border-gray-100">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {chips.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onSelectChip(chip.replace(/^[^\w\s]+/, '').trim())}
            activeOpacity={0.8}
            className="bg-gray-100 active:bg-gray-200 px-3 py-1.5 rounded-full border border-gray-200"
          >
            <Text className="text-xs text-gray-700 font-medium">{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
