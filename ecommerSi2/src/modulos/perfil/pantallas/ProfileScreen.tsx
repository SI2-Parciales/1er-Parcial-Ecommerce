import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { Badge } from '@shared/components/Badge';
import { Button } from '@shared/components/Button';
import {
  User,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  QrCode,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Package,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';
import { BranchSelectionModal } from '@modulos/sucursales/componentes/BranchSelectionModal';
import type { BottomTabTabScreenProps } from '@app/navigation/types';
import type { ClientOrder } from '@modulos/carrito/tipos/cart.types';

export const ProfileScreen: React.FC<BottomTabTabScreenProps<'ProfileTab'>> = ({
  navigation,
}) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeBranch, openSelectionModal } = useBranchStore();
  const { orders } = useCartStore();
  const { reservations } = useFittingBagStore();

  const [activeSegment, setActiveSegment] = useState<'PROFILE' | 'ORDERS'>('PROFILE');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-gray-50 flex-1" style={{ flex: 1 }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">Mi Cuenta</Text>
          {isAuthenticated ? (
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center bg-red-50 px-3 py-1.5 rounded-full border border-red-100"
            >
              <LogOut size={14} color="#DC2626" />
              <Text className="text-xs font-semibold text-red-600 ml-1">Salir</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('LoginModal')}
              className="bg-brand-primary px-3 py-1.5 rounded-full"
            >
              <Text className="text-xs font-bold text-white">Iniciar Sesión</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Control */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl mt-3">
          <TouchableOpacity
            onPress={() => {
              setActiveSegment('PROFILE');
              setSelectedOrder(null);
            }}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeSegment === 'PROFILE' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeSegment === 'PROFILE' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Datos de Usuario
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSegment('ORDERS')}
            className={`flex-1 py-2 rounded-lg items-center flex-row justify-center ${
              activeSegment === 'ORDERS' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold mr-1.5 ${
                activeSegment === 'ORDERS' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Historial de Compras
            </Text>
            {orders.length > 0 && (
              <View className="bg-brand-primary px-1.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-white">{orders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeSegment === 'PROFILE' ? (
          <>
            {/* User Identity Card */}
            {isAuthenticated && user ? (
              <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 items-center justify-center">
                    <User size={30} color="#111827" />
                  </View>
                  <View className="ml-3.5 flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-bold text-gray-900">{user.name}</Text>
                      <Badge label="Miembro VIP" variant="warning" size="sm" />
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Mail size={12} color="#6B7280" />
                      <Text className="text-xs text-gray-500 ml-1.5">{user.email}</Text>
                    </View>
                    <View className="flex-row items-center mt-0.5">
                      <Phone size={12} color="#6B7280" />
                      <Text className="text-xs text-gray-500 ml-1.5">{user.phone || '+591 70000000'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs mb-4 items-center">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <User size={26} color="#6B7280" />
                </View>
                <Text className="text-base font-bold text-gray-900 mb-1">
                  Bienvenido a FashionStore
                </Text>
                <Text className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
                  Inicia sesión o regístrate para sincronizar tu historial de compras, guardar tus reservas de probador y ganar beneficios VIP.
                </Text>
                <View className="flex-row w-full gap-2">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('LoginModal')}
                    className="flex-1 bg-brand-primary py-2.5 rounded-xl items-center"
                  >
                    <Text className="text-xs font-bold text-white">Iniciar Sesión</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RegisterModal')}
                    className="flex-1 bg-gray-100 border border-gray-300 py-2.5 rounded-xl items-center"
                  >
                    <Text className="text-xs font-bold text-gray-800">Crear Cuenta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Metrics & Quick Stats */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs items-center">
                <ShoppingBag size={20} color="#111827" />
                <Text className="text-lg font-extrabold text-gray-900 mt-1">
                  {orders.length}
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium text-center">
                  Compras
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'ReservationsTab' })}
                className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs items-center"
              >
                <Calendar size={20} color="#2563EB" />
                <Text className="text-lg font-extrabold text-blue-600 mt-1">
                  {reservations.length}
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium text-center">
                  Reservas Pick & Try
                </Text>
              </TouchableOpacity>

              <View className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs items-center">
                <Sparkles size={20} color="#D97706" />
                <Text className="text-lg font-extrabold text-amber-600 mt-1">
                  450
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium text-center">
                  Puntos VIP
                </Text>
              </View>
            </View>

            {/* Preferencias de Sucursal Física */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <MapPin size={18} color="#111827" />
                  <Text className="text-sm font-bold text-gray-900 ml-2">
                    Sucursal Favorita
                  </Text>
                </View>
                <Badge label="Activa" variant="success" size="sm" />
              </View>

              <Text className="text-xs text-gray-500 leading-relaxed mb-3">
                Esta sucursal se usa para verificar el stock inmediato de prendas y apartar cabinas de probador físico.
              </Text>

              <View className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-xs font-bold text-gray-900">
                    {activeBranch.name} ({activeBranch.code})
                  </Text>
                  <Text className="text-[11px] text-gray-500 mt-0.5">
                    {activeBranch.address} • {activeBranch.city}
                  </Text>
                </View>
              </View>

              <Button
                title="Cambiar Sucursal Activa"
                variant="outline"
                size="sm"
                onPress={openSelectionModal}
              />
            </View>

            {/* Informative Highlights */}
            <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs mb-4">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Garantías & Servicios FashionStore
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between py-1 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <ShieldCheck size={16} color="#059669" />
                    <Text className="text-xs font-semibold text-gray-800 ml-2">
                      Garantía de cambio en tienda
                    </Text>
                  </View>
                  <Text className="text-[11px] text-gray-400">7 días continuos</Text>
                </View>

                <View className="flex-row items-center justify-between py-1 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#2563EB" />
                    <Text className="text-xs font-semibold text-gray-800 ml-2">
                      Apartado Pick & Try
                    </Text>
                  </View>
                  <Text className="text-[11px] text-gray-400">Hasta 5 prendas / 2 hrs</Text>
                </View>

                <View className="flex-row items-center justify-between py-1">
                  <View className="flex-row items-center">
                    <CreditCard size={16} color="#4F46E5" />
                    <Text className="text-xs font-semibold text-gray-800 ml-2">
                      Pasarela Digital & Pago QR
                    </Text>
                  </View>
                  <Text className="text-[11px] text-gray-400">Verificación inmediata</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* ========================================================== */
          /* CU14: CONSULTAR HISTORIAL DE COMPRAS DIGITALES             */
          /* ========================================================== */
          <View>
            <View className="mb-3">
              <Text className="text-base font-bold text-gray-900">
                Historial de Compras Digitales
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Revisa el estado de entrega, comprobante de pago y prendas adquiridas.
              </Text>
            </View>

            {orders.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
                <Package size={44} color="#9CA3AF" />
                <Text className="text-base font-bold text-gray-800 mt-3">
                  Aún no tienes compras
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1 mb-4">
                  Tus pedidos realizados con tarjeta o pago QR aparecerán detallados en esta sección.
                </Text>
                <Button
                  title="Explorar Catálogo"
                  variant="primary"
                  size="sm"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
                />
              </View>
            ) : (
              <View className="space-y-3.5">
                {orders.map((order) => {
                  const isExpanded = selectedOrder?.id === order.id;
                  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs"
                    >
                      {/* Order Header Summary */}
                      <TouchableOpacity
                        onPress={() => setSelectedOrder(isExpanded ? null : order)}
                        className="p-4 bg-white"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Text className="text-sm font-bold text-gray-900 mr-2">
                              #{order.orderNumber}
                            </Text>
                            <Badge
                              label={
                                order.status === 'PAID'
                                  ? 'Pagado & Confirmado'
                                  : 'Verificando Pago QR'
                              }
                              variant={order.status === 'PAID' ? 'success' : 'warning'}
                              size="sm"
                            />
                          </View>
                          <Text className="text-base font-extrabold text-brand-primary">
                            ${order.total.toFixed(2)} USD
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between text-xs text-gray-500">
                          <View className="flex-row items-center">
                            <Clock size={12} color="#6B7280" />
                            <Text className="text-xs text-gray-500 ml-1">
                              {formattedDate}
                            </Text>
                          </View>

                          <View className="flex-row items-center">
                            {order.paymentMethod === 'CARD_GATEWAY' ? (
                              <CreditCard size={12} color="#4F46E5" />
                            ) : (
                              <QrCode size={12} color="#059669" />
                            )}
                            <Text className="text-xs font-semibold text-gray-700 ml-1">
                              {order.paymentMethod === 'CARD_GATEWAY' ? 'Tarjeta' : 'QR Estático'}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <Text className="text-[11px] text-gray-500">
                            {order.deliveryType === 'PICKUP_IN_STORE'
                              ? `Retiro: ${order.branchName || 'Sucursal Central'}`
                              : 'Envío express a domicilio'}
                          </Text>
                          <Text className="text-xs font-bold text-brand-primary">
                            {isExpanded ? 'Ocultar prendas ▲' : `Ver ${order.items.length} prendas ▼`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Breakdown */}
                      {isExpanded && (
                        <View className="bg-gray-50 p-4 border-t border-gray-200">
                          <Text className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            Detalle de Artículos:
                          </Text>

                          <View className="space-y-2 mb-3">
                            {order.items.map((item, idx) => (
                              <View
                                key={idx}
                                className="flex-row items-center bg-white p-2.5 rounded-xl border border-gray-200"
                              >
                                <Image
                                  source={{ uri: item.imageUrl }}
                                  className="w-12 h-12 rounded-lg bg-gray-200"
                                  resizeMode="cover"
                                />
                                <View className="flex-1 ml-3">
                                  <Text
                                    numberOfLines={1}
                                    className="text-xs font-bold text-gray-900"
                                  >
                                    {item.name}
                                  </Text>
                                  <Text className="text-[11px] text-gray-500">
                                    Talla: {item.sizeName} • Color: {item.colorName} • Cant: {item.quantity}
                                  </Text>
                                  <Text className="text-xs font-semibold text-brand-primary mt-0.5">
                                    ${(item.price * item.quantity).toFixed(2)} USD
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>

                          {/* Payment & Delivery Summary */}
                          <View className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">Subtotal</Text>
                              <Text className="text-xs font-medium text-gray-800">
                                ${order.subtotal.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">Envío</Text>
                              <Text className="text-xs font-medium text-gray-800">
                                {order.shippingCost > 0
                                  ? `$${order.shippingCost.toFixed(2)}`
                                  : 'Gratis ($0.00)'}
                              </Text>
                            </View>
                            <View className="flex-row justify-between pt-1 border-t border-gray-100">
                              <Text className="text-xs font-bold text-gray-900">Total Pagado</Text>
                              <Text className="text-xs font-extrabold text-brand-primary">
                                ${order.total.toFixed(2)} USD
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal selector de sucursal */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};
