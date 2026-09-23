import React from 'react';
import { View, Text } from 'react-native';
import { Store } from 'lucide-react-native';

export interface InsigniaDisponibilidadSucursalProps {
  branchName: string;
  stockInBranch: number;
}

export const InsigniaDisponibilidadSucursal: React.FC<InsigniaDisponibilidadSucursalProps> = ({
  branchName,
  stockInBranch,
}) => {
  const isAvailable = stockInBranch > 0;

  return (
    <View className="mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex-row items-center justify-between">
      <View className="flex-row items-center gap-2.5">
        <View className={`p-2 rounded-xl ${isAvailable ? 'bg-emerald-100' : 'bg-red-100'}`}>
          <Store size={18} color={isAvailable ? '#059669' : '#DC2626'} />
        </View>
        <View>
          <Text className="text-xs font-bold text-gray-900">
            {branchName}
          </Text>
          <Text className={`text-[11px] font-medium ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
            {isAvailable ? `${stockInBranch} unidades disponibles en tienda` : 'Agotado en esta sucursal'}
          </Text>
        </View>
      </View>
    </View>
  );
};
