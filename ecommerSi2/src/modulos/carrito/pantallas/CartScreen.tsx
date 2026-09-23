import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useCartStore } from '../almacen/cart.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from '@app/navigation/types';
import { FilaItemCarrito } from '../componentes/FilaItemCarrito';
import { SelectorModalidadEntrega } from '../componentes/SelectorModalidadEntrega';
import { ResumenFinancieroPedido } from '../componentes/ResumenFinancieroPedido';
import { EstadoCarritoVacio } from '../componentes/EstadoCarritoVacio';

type Props = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'CartTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const CartScreen: React.FC<Props> = ({ navigation }) => {
  const { items, deliveryType, updateQuantity, removeItem, setDeliveryType, getSubtotal, getShippingCost, getTotal } = useCartStore();
  const { activeBranch } = useBranchStore();

  const subtotal = getSubtotal();
  const shipping = getShippingCost();
  const total = getTotal();

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Bolsa de Compras
          </Text>
          <Text className="text-xl font-black text-gray-900 mt-0.5">
            Mi Carrito ({items.length})
          </Text>
        </View>
        <ShoppingBag size={22} color="#2563EB" />
      </View>

      <ScrollView style={{ flex: 1 }} className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Items List */}
        {items.length === 0 ? (
          <EstadoCarritoVacio onGoToCatalog={() => navigation.navigate('CatalogTab')} />
        ) : (
          <View className="space-y-3 mb-4">
            {items.map((item) => (
              <FilaItemCarrito
                key={item.variantId}
                item={item}
                onUpdateQuantity={(q) => updateQuantity(item.variantId, q)}
                onRemove={() => removeItem(item.variantId)}
              />
            ))}
          </View>
        )}

        {items.length > 0 && (
          <>
            {/* Modalidad de Entrega Component */}
            <SelectorModalidadEntrega
              deliveryType={deliveryType}
              onSelectDeliveryType={setDeliveryType}
              branchName={activeBranch.name}
              branchAddress={activeBranch.address}
            />

            {/* Financial Summary Component */}
            <ResumenFinancieroPedido
              subtotal={subtotal}
              shipping={shipping}
              total={total}
            />
          </>
        )}
      </ScrollView>

      {/* Checkout Button */}
      {items.length > 0 && (
        <View className="p-4 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => navigation.navigate('Checkout')}
            activeOpacity={0.85}
            className="w-full bg-blue-600 py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-md shadow-blue-500/30"
          >
            <Text className="text-white font-bold text-sm">
              Proceder al Pago
            </Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
};
