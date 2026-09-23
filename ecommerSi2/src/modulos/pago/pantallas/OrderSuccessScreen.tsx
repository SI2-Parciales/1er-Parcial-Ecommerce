import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { CheckCircle2, Clock, ArrowRight, ShoppingBag } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

export const OrderSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId, status } = route.params;
  const isPaid = status === 'PAID';

  return (
    <ScreenContainer className="bg-white items-center justify-center p-6">
      <View className="items-center max-w-sm text-center">
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${
          isPaid ? 'bg-emerald-100' : 'bg-blue-100'
        }`}>
          {isPaid ? (
            <CheckCircle2 size={44} color="#059669" />
          ) : (
            <Clock size={44} color="#2563EB" />
          )}
        </View>

        <Text className="text-2xl font-black text-gray-900 text-center">
          {isPaid ? '¡Pago Aprobado con Éxito!' : '¡Pedido Recibido con Éxito!'}
        </Text>

        <Text className="font-mono text-sm font-bold text-blue-600 mt-2 bg-blue-50 px-3 py-1 rounded-full">
          Orden #{orderId}
        </Text>

        <Text className="text-xs text-gray-500 text-center mt-3 leading-relaxed">
          {isPaid
            ? 'Tu compra digital ha sido liquidada. Estamos empaquetando tus prendas para recojo o despacho inmediato.'
            : 'Hemos recibido tu comprobante de pago por QR. Nuestro equipo en tienda validará la transacción en breve.'}
        </Text>

        <View className="w-full mt-8 space-y-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
            className="w-full bg-blue-600 py-3.5 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
          >
            <Text className="text-white font-bold text-sm">Ver en Mis Compras</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
            className="w-full bg-gray-100 py-3 rounded-xl items-center justify-center mt-2"
          >
            <Text className="text-gray-800 font-semibold text-xs">Volver al Catálogo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};
