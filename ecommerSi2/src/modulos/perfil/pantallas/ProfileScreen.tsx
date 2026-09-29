import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  User,
  MapPin,
  Calendar,
  ShoppingBag,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
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

  // Puntos VIP calculados solo para la cuenta que ha iniciado sesión (100 puntos por cada compra)
  const userVipPoints = isAuthenticated ? orders.length * 100 : 0;
  const userPurchasesCount = isAuthenticated ? orders.length : 0;
  const userReservationsCount = isAuthenticated ? reservations.length : 0;

  return (
    <ScreenContainer className="bg-gray-50 flex-1" style={{ flex: 1 }}>
      {/* Header Superior Rediseñado */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Mi Cuenta</Text>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
              {isAuthenticated ? `Conectado como ${user?.nombre || user?.email}` : 'Modo Invitado FashionStore'}
            </Text>
          </View>

          {isAuthenticated ? (
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEF2F2',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#FEE2E2',
              }}
              activeOpacity={0.7}
            >
              <LogOut size={13} color="#DC2626" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626', marginLeft: 4 }}>Salir</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('LoginModal')}
              style={{
                backgroundColor: '#0F172A',
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Control Limpio (Sin texto superpuesto ni píldoras rotas) */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 14, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              setActiveSegment('PROFILE');
              setSelectedOrder(null);
            }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeSegment === 'PROFILE' ? '#FFFFFF' : 'transparent',
              elevation: activeSegment === 'PROFILE' ? 1 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeSegment === 'PROFILE' ? '#0F172A' : '#64748B',
              }}
            >
              Datos de Usuario
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSegment('ORDERS')}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              backgroundColor: activeSegment === 'ORDERS' ? '#FFFFFF' : 'transparent',
              elevation: activeSegment === 'ORDERS' ? 1 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeSegment === 'ORDERS' ? '#0F172A' : '#64748B',
                marginRight: 6,
              }}
            >
              Historial de Compras
            </Text>
            {isAuthenticated && orders.length > 0 && (
              <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{orders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeSegment === 'PROFILE' ? (
          <>
            {/* Tarjeta de Identidad del Usuario / Bienvenida */}
            {isAuthenticated && user ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 16,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 18,
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D4ED8' }}>
                      {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>

                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }} numberOfLines={1}>
                        {user.nombre} {user.apellido || ''}
                      </Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>VIP</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Mail size={12} color="#64748B" />
                      <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>{user.email}</Text>
                    </View>

                    {user.phone && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                        <Phone size={12} color="#64748B" />
                        <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>{user.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 22,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 16,
                  alignItems: 'center',
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <User size={26} color="#475569" />
                </View>

                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 4, textAlign: 'center' }}>
                  Bienvenido a FashionStore
                </Text>

                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 18, paddingHorizontal: 10 }}>
                  Inicia sesión o regístrate para sincronizar tu historial de compras, tus reservas de probador y ganar beneficios VIP.
                </Text>

                {/* Botones de Acción con Separación Limpia */}
                <View style={{ flexDirection: 'row', width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('LoginModal')}
                    style={{
                      flex: 1,
                      backgroundColor: '#0F172A',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Iniciar Sesión</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('RegisterModal')}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Crear Cuenta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Métricas y Estadísticas (SOLO datos de la cuenta activa) */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {/* Compras */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  marginRight: 6,
                }}
              >
                <ShoppingBag size={20} color="#0F172A" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 4 }}>
                  {userPurchasesCount}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 }}>Compras</Text>
              </View>

              {/* Reservas Pick & Try */}
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'ReservationsTab' })}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  marginHorizontal: 3,
                }}
                activeOpacity={0.7}
              >
                <Calendar size={20} color="#2563EB" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563EB', marginTop: 4 }}>
                  {userReservationsCount}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                  Reservas
                </Text>
              </TouchableOpacity>

              {/* Puntos VIP */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  marginLeft: 6,
                }}
              >
                <Sparkles size={20} color="#D97706" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#D97706', marginTop: 4 }}>
                  {userVipPoints}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 }}>Puntos VIP</Text>
              </View>
            </View>

            {/* Preferencias de Sucursal Física */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MapPin size={18} color="#0F172A" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginLeft: 8 }}>
                    Sucursal Favorita
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>ACTIVA</Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 12 }}>
                Esta sucursal se usa para verificar el stock inmediato de prendas y apartar cabinas de probador físico.
              </Text>

              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  {activeBranch.name} ({activeBranch.code})
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {activeBranch.address} • {activeBranch.city}
                </Text>
              </View>

              <TouchableOpacity
                onPress={openSelectionModal}
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8', marginRight: 4 }}>Cambiar Sucursal Activa</Text>
                <ChevronRight size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>

            {/* Garantías & Servicios de la Marca */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Garantías & Servicios FashionStore
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginLeft: 8 }}>
                    Garantía de cambio en tienda
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B' }}>7 días continuos</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={16} color="#2563EB" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginLeft: 8 }}>
                    Apartado Pick & Try
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Hasta 5 prendas / 2 hrs</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Truck size={16} color="#7C3AED" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginLeft: 8 }}>
                    Pasarela Digital & Pago QR
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Verificación inmediata</Text>
              </View>
            </View>
          </>
        ) : (
          /* Historial de Compras */
          <View>
            {!isAuthenticated ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <ShoppingBag size={40} color="#94A3B8" />
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 12, textAlign: 'center' }}>
                  Inicia sesión para ver tus compras
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  Tu historial de pedidos digitales y facturas se asocian a tu cuenta.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('LoginModal')}
                  style={{ backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Iniciar Sesión</Text>
                </TouchableOpacity>
              </View>
            ) : orders.length === 0 ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <ShoppingBag size={42} color="#CBD5E1" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 12 }}>
                  Aún no tienes compras realizadas
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
                  Explora nuestro catálogo y realiza tu primer pedido con entrega a domicilio o retiro en tienda.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
                  style={{ backgroundColor: '#0F172A', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginRight: 6 }}>Ir al Catálogo</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              orders.map((ord) => (
                <View
                  key={ord.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#2563EB' }}>
                      {ord.orderNumber}
                    </Text>
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>
                        {ord.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Fecha: {new Date(ord.createdAt).toLocaleDateString('es-BO')}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {ord.items.length} prenda(s) • Entrega: {ord.deliveryType === 'PICKUP_IN_STORE' ? 'Retiro en Tienda' : 'A Domicilio'}
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Total Liquidado:</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                      Bs. {ord.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de selección de sucursales */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};
