import React from 'react';
import { View, Text } from 'react-native';

export interface ResumenFinancieroPedidoProps {
  subtotal: number;
  shipping: number;
  total: number;
}

export const ResumenFinancieroPedido: React.FC<ResumenFinancieroPedidoProps> = ({
  subtotal,
  shipping,
  total,
}) => {
  return (
    <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 shadow-xs space-y-2 text-xs">
      <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
        Resumen del Pedido
      </Text>

      <View className="flex-row justify-between text-gray-600 mb-1.5">
        <Text className="text-xs text-gray-500">Subtotal prendas:</Text>
        <Text className="text-xs font-bold text-gray-900">Bs. {subtotal.toFixed(2)}</Text>
      </View>

      <View className="flex-row justify-between text-gray-600 mb-2">
        <Text className="text-xs text-gray-500">Costo de entrega:</Text>
        <Text className="text-xs font-bold text-gray-900">
          {shipping === 0 ? 'GRATIS' : `Bs. ${shipping.toFixed(2)}`}
        </Text>
      </View>

      <View className="border-t border-gray-100 pt-2.5 flex-row justify-between items-center">
        <Text className="text-sm font-black text-gray-900">Total a Pagar:</Text>
        <Text className="text-lg font-black text-blue-600">Bs. {total.toFixed(2)}</Text>
      </View>
    </View>
  );
};
