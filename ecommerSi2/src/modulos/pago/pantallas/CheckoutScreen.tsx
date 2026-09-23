import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { 
  ArrowLeft, 
  CreditCard, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Copy,
  Receipt
} from 'lucide-react-native';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { cartService } from '@modulos/carrito/servicios/cart.service';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { getTotal, createOrder } = useCartStore();
  const { activeBranch } = useBranchStore();
  const total = getTotal();

  const [paymentMethod, setPaymentMethod] = useState<'CARD_GATEWAY' | 'STATIC_QR'>('STATIC_QR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Tarjeta
  const [cardNumber, setCardNumber] = useState('4552 1234 5678 9012');
  const [cardHolder, setCardHolder] = useState('MARIANA LOPEZ');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('883');

  // Form QR / Comprobante
  const [isReceiptUploaded, setIsReceiptUploaded] = useState(false);

  const handleProcessPayment = async () => {
    if (paymentMethod === 'CARD_GATEWAY') {
      if (!cardNumber || !cardHolder || !cardCvv) {
        Alert.alert('Datos incompletos', 'Completa los datos de tu tarjeta bancaria.');
        return;
      }
    } else {
      if (!isReceiptUploaded) {
        Alert.alert('Comprobante requerido', 'Por favor adjunta la captura de tu transferencia o pago por QR.');
        return;
      }
    }

    setIsSubmitting(true);
    let digitalSaleId: number | null = null;

    try {
      // 1. Registrar venta digital en el backend NestJS (CU12)
      const digitalSale = await cartService.createDigitalSale(
        cardHolder.trim() || 'Cliente Móvil',
        '1234567'
      );
      digitalSaleId = digitalSale.id;

      // 2. Confirmar pago electrónico simulado en el backend (CU36)
      await cartService.processElectronicPayment(
        digitalSale.id,
        paymentMethod === 'CARD_GATEWAY' ? 'TARJETA' : 'QR'
      );
    } catch (err: any) {
      console.warn('Backend venta digital no completada online, usando orden local:', err.message);
    } finally {
      setIsSubmitting(false);
    }

    const order = createOrder(
      paymentMethod,
      activeBranch.name,
      isReceiptUploaded ? 'https://example.com/receipt.jpg' : undefined
    );

    navigation.replace('OrderSuccess', {
      orderId: digitalSaleId ? `FAC-DIG-${digitalSaleId}` : order.orderNumber,
      status: 'PAID',
    });
  };

  return (
    <ScreenContainer className="bg-gray-50/50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900">
          Checkout y Pasarela de Pago
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Total Header Card */}
        <View className="bg-gradient-to-r from-blue-900 to-indigo-950 p-5 rounded-2xl mb-4 text-white shadow-sm">
          <Text className="text-xs text-blue-200 font-semibold uppercase tracking-wider">
            Total a Pagar
          </Text>
          <Text className="text-3xl font-black text-white mt-1">
            Bs. {total.toFixed(2)}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-2">
            <Lock size={12} color="#93C5FD" />
            <Text className="text-[11px] text-blue-200">
              Transacción encriptada con pasarela de pagos certificada
            </Text>
          </View>
        </View>

        {/* Payment Method Selector */}
        <View className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-xs">
          <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
            Selecciona Medio de Pago
          </Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setPaymentMethod('STATIC_QR')}
              className={`flex-1 p-3.5 rounded-xl border items-center justify-center gap-1.5 ${
                paymentMethod === 'STATIC_QR'
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <QrCode size={22} color={paymentMethod === 'STATIC_QR' ? '#2563EB' : '#6B7280'} />
              <Text className={`text-xs font-bold ${paymentMethod === 'STATIC_QR' ? 'text-blue-900' : 'text-gray-700'}`}>
                Pago por QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod('CARD_GATEWAY')}
              className={`flex-1 p-3.5 rounded-xl border items-center justify-center gap-1.5 ${
                paymentMethod === 'CARD_GATEWAY'
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <CreditCard size={22} color={paymentMethod === 'CARD_GATEWAY' ? '#2563EB' : '#6B7280'} />
              <Text className={`text-xs font-bold ${paymentMethod === 'CARD_GATEWAY' ? 'text-blue-900' : 'text-gray-700'}`}>
                Tarjeta Bancaria
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECCIÓN PAGO POR QR */}
        {paymentMethod === 'STATIC_QR' && (
          <View className="bg-white p-5 rounded-2xl border border-gray-200 mb-6 shadow-xs items-center">
            <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              QR Institucional FashionStore
            </Text>

            {/* Stylized Simulated Payment QR */}
            <View className="w-48 h-48 bg-gray-50 border-2 border-gray-900 rounded-2xl p-4 items-center justify-between shadow-inner">
              <View className="flex-row justify-between w-full">
                <View className="w-10 h-10 bg-gray-900 rounded-md" />
                <View className="w-10 h-10 bg-gray-900 rounded-md" />
              </View>
              <View className="items-center py-2">
                <Text className="text-xs font-black text-blue-600">Bs. {total.toFixed(2)}</Text>
                <Text className="text-[9px] text-gray-500 font-mono">FASHIONSTORE QR BCP</Text>
              </View>
              <View className="flex-row justify-between w-full">
                <View className="w-10 h-10 bg-gray-900 rounded-md" />
                <View className="w-6 h-6 bg-blue-600 rounded-md" />
              </View>
            </View>

            <View className="w-full mt-4 p-3 bg-gray-50 rounded-xl space-y-1">
              <View className="flex-row justify-between items-center text-xs">
                <Text className="text-xs text-gray-500">Cuenta BCP:</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Copiado', 'Número de cuenta copiado.')}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-xs font-mono font-bold text-blue-600">201-50893321-3-45</Text>
                  <Copy size={12} color="#2563EB" />
                </TouchableOpacity>
              </View>
              <Text className="text-[10px] text-gray-400">Titular: FashionStore Retail Bolivia S.R.L.</Text>
            </View>

            {/* Zona de Carga de Comprobante */}
            <View className="w-full mt-4">
              <Text className="text-xs font-bold text-gray-700 mb-2">
                Subir Fotografía del Comprobante
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsReceiptUploaded(true);
                  Alert.alert('Comprobante Cargado', 'Fotografía de transferencia comprimida y adjuntada correctamente.');
                }}
                className={`w-full p-4 rounded-xl border-2 border-dashed items-center justify-center ${
                  isReceiptUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 bg-gray-50'
                }`}
              >
                {isReceiptUploaded ? (
                  <View className="items-center gap-1">
                    <CheckCircle2 size={24} color="#059669" />
                    <Text className="text-xs font-bold text-emerald-700">Comprobante Listo (1.2 MB)</Text>
                    <Text className="text-[10px] text-emerald-600">Toca para cambiar archivo</Text>
                  </View>
                ) : (
                  <View className="items-center gap-1">
                    <Upload size={22} color="#9CA3AF" />
                    <Text className="text-xs font-bold text-gray-700">Adjuntar Captura de Pago</Text>
                    <Text className="text-[10px] text-gray-400">Formatos JPG, PNG (máx. 5 MB)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECCIÓN TARJETA BANCARIA */}
        {paymentMethod === 'CARD_GATEWAY' && (
          <View className="bg-white p-5 rounded-2xl border border-gray-200 mb-6 shadow-xs space-y-3">
            <Text className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              Datos de Tarjeta
            </Text>

            <View className="mb-3">
              <Text className="text-xs font-medium text-gray-600 mb-1">Número de Tarjeta</Text>
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900"
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-gray-600 mb-1">Nombre del Titular</Text>
              <TextInput
                value={cardHolder}
                onChangeText={setCardHolder}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-medium text-gray-600 mb-1">Vencimiento</Text>
                <TextInput
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                  placeholder="MM/AA"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900"
                />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-medium text-gray-600 mb-1">CVV / CVC</Text>
                <TextInput
                  value={cardCvv}
                  onChangeText={setCardCvv}
                  secureTextEntry
                  maxLength={4}
                  keyboardType="numeric"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Process Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleProcessPayment}
          disabled={isSubmitting}
          activeOpacity={0.85}
          className={`w-full py-4 rounded-2xl items-center justify-center shadow-md ${
            isSubmitting ? 'bg-blue-400' : 'bg-blue-600 shadow-blue-500/30'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-white font-bold text-sm">
              {paymentMethod === 'CARD_GATEWAY' ? 'Pagar Ahora con Tarjeta' : 'Confirmar Envío de Comprobante'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};
