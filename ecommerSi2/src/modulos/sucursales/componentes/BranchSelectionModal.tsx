import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Store, MapPin, Phone, Check, X, Navigation } from 'lucide-react-native';
import { useBranchStore } from '../almacen/branch.store';

export const BranchSelectionModal: React.FC = () => {
  const { activeBranch, availableBranches, isSelectionModalOpen, setActiveBranch, closeSelectionModal, fetchBranches } = useBranchStore();

  useEffect(() => {
    if (isSelectionModalOpen) {
      fetchBranches();
    }
  }, [isSelectionModalOpen]);

  return (
    <Modal
      visible={isSelectionModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={closeSelectionModal}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-4 border-b border-gray-100">
            <View>
              <Text className="text-lg font-bold text-gray-900">
                Selecciona tu Sucursal
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Verifica stock real y disponibilidad de probadores
              </Text>
            </View>
            <TouchableOpacity onPress={closeSelectionModal} className="p-1.5 bg-gray-100 rounded-full">
              <X size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* List of Branches */}
          <ScrollView className="mt-4 space-y-3" showsVerticalScrollIndicator={false}>
            {availableBranches.map((branch) => {
              const isSelected = branch.id === activeBranch.id;
              return (
                <TouchableOpacity
                  key={branch.id}
                  onPress={() => setActiveBranch(branch)}
                  activeOpacity={0.8}
                  className={`p-4 rounded-2xl border mb-3 flex-row justify-between items-center ${
                    isSelected ? 'border-blue-600 bg-blue-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Store size={16} color={isSelected ? '#2563EB' : '#4B5563'} />
                      <Text className={`font-bold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {branch.name}
                      </Text>
                    </View>

                    <View className="flex-row items-start gap-1.5 mb-1">
                      <MapPin size={12} color="#9CA3AF" />
                      <Text className="text-xs text-gray-600 flex-1">
                        {branch.address}, {branch.city}
                      </Text>
                    </View>

                    {branch.gpsLocation && (
                      <View className="flex-row items-center gap-1.5 mb-1 bg-blue-50 px-2 py-0.5 rounded-md self-start">
                        <Navigation size={10} color="#2563EB" />
                        <Text className="text-[10px] font-mono font-semibold text-blue-700">
                          GPS: {branch.gpsLocation}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row items-center gap-1.5">
                      <Phone size={12} color="#9CA3AF" />
                      <Text className="text-[11px] text-gray-500">
                        {branch.phone} • {branch.fittingRoomsCount} probadores activos
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
