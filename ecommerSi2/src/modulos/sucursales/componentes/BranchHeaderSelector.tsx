import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, ChevronDown } from 'lucide-react-native';
import { useBranchStore } from '../almacen/branch.store';

export const BranchHeaderSelector: React.FC = () => {
  const { activeBranch, openSelectionModal } = useBranchStore();

  return (
    <TouchableOpacity
      onPress={openSelectionModal}
      activeOpacity={0.7}
      className="flex-row items-center bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200"
    >
      <MapPin size={14} color="#2563EB" />
      <View className="mx-1.5">
        <Text className="text-[10px] text-gray-500 font-medium leading-tight">
          Tienda Física
        </Text>
        <Text className="text-xs font-bold text-gray-900 leading-tight" numberOfLines={1}>
          {activeBranch.name}
        </Text>
      </View>
      <ChevronDown size={14} color="#6B7280" />
    </TouchableOpacity>
  );
};
