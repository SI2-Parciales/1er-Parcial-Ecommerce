import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
  Truck,
  ShieldCheck,
  CalendarCheck,
  ShoppingBag,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

export const OrderSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    orderId,
    status,
    type = 'PURCHASE',
    total = 0,
    branchName = 'Sucursal Central',
    itemsCount = 1,
    deliveryType = 'PICKUP_IN_STORE',
  } = route.params;

  const isReservation = type === 'RESERVATION' || status === 'RESERVED_IN_STORE';
  const isPaid = status === 'PAID';

  const currentDate = new Date().toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícono de Estado */}
        <View
          style={[
            styles.iconWrapper,
            isReservation
              ? styles.iconWrapperAmber
              : isPaid
                ? styles.iconWrapperEmerald
                : styles.iconWrapperBlue,
          ]}
        >
          {isReservation ? (
            <CalendarCheck size={44} color="#D97706" />
          ) : isPaid ? (
            <CheckCircle2 size={44} color="#059669" />
          ) : (
            <Clock size={44} color="#2563EB" />
          )}
        </View>

        {/* Título y Subtítulo */}
        <Text style={styles.title}>
          {isReservation
            ? '¡Reserva Confirmada en Tienda!'
            : isPaid
              ? '¡Pago Aprobado y Validado!'
              : '¡Pedido Recibido con Éxito!'}
        </Text>

        <Text style={styles.subtitle}>
          {isReservation
            ? 'Tus prendas han sido apartadas exclusivamente para ti por 48 horas en tienda física.'
            : isPaid
              ? 'Tu transacción ha sido liquidada exitosamente. Estamos alistando tus prendas para entrega inmediata.'
              : 'Hemos recibido tu comprobante de pago QR para la validación automática del sistema.'}
        </Text>

        {/* Badge Código de Orden / Reserva */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeLabel}>
            {isReservation ? 'CÓDIGO DE RESERVA' : 'COMPROBANTE OFICIAL'}
          </Text>
          <Text style={styles.codeBadgeValue}>#{orderId}</Text>
        </View>

        {/* Ticket Digital de Validación */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#2563EB" />
              <Text style={styles.ticketHeaderTitle}>TICKET DE VALIDACIÓN DIGITAL</Text>
            </View>
            <View
              style={[
                styles.ticketStatusPill,
                isReservation
                  ? styles.ticketStatusAmber
                  : isPaid
                    ? styles.ticketStatusEmerald
                    : styles.ticketStatusBlue,
              ]}
            >
              <Text
                style={[
                  styles.ticketStatusText,
                  isReservation
                    ? { color: '#B45309' }
                    : isPaid
                      ? { color: '#047857' }
                      : { color: '#1E40AF' },
                ]}
              >
                {isReservation ? 'APARTADO 48H' : isPaid ? 'PAGADO' : 'EN ESPERA'}
              </Text>
            </View>
          </View>

          <View style={styles.ticketDivider} />

          {/* Filas de Información */}
          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Fecha de emisión</Text>
            <Text style={styles.ticketValue}>{currentDate} • {currentTime}</Text>
          </View>

          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Modalidad</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {deliveryType === 'PICKUP_IN_STORE' ? (
                <>
                  <Store size={12} color="#475569" />
                  <Text style={styles.ticketValue}>Retiro en Sucursal</Text>
                </>
              ) : (
                <>
                  <Truck size={12} color="#475569" />
                  <Text style={styles.ticketValue}>Envío a Domicilio</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Sucursal Asignada</Text>
            <Text style={styles.ticketValue}>{branchName}</Text>
          </View>

          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Total Prendas</Text>
            <Text style={styles.ticketValue}>{itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'}</Text>
          </View>

          {total > 0 && (
            <View style={[styles.ticketRow, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
              <Text style={[styles.ticketLabel, { fontWeight: '800', color: '#0F172A' }]}>
                {isReservation ? 'Total a liquidar en caja' : 'Monto total pagado'}
              </Text>
              <Text style={styles.ticketTotalValue}>
                Bs. {total.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Instrucciones explicativas según tipo */}
          <View style={styles.ticketFooterBox}>
            <Text style={styles.ticketFooterText}>
              {isReservation
                ? '💡 Muestra este código en caja al momento de retirar tus prendas. Tienes 48 horas antes de que el inventario sea liberado.'
                : '💡 Conserva este comprobante digital. Podrás revisarlo en cualquier momento desde tu perfil o historial de compras.'}
            </Text>
          </View>
        </View>

        {/* Acciones principales */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              if (isReservation) {
                navigation.navigate('MainTabs', { screen: 'ReservationsTab' });
              } else {
                navigation.navigate('MainTabs', { screen: 'ProfileTab' });
              }
            }}
            activeOpacity={0.88}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>
              {isReservation ? 'Ver en Mis Reservas' : 'Ver en Mis Compras'}
            </Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
            activeOpacity={0.7}
            style={styles.secondaryBtn}
          >
            <ShoppingBag size={14} color="#334155" />
            <Text style={styles.secondaryBtnText}>Volver al Catálogo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  iconWrapperEmerald: {
    backgroundColor: '#D1FAE5',
  },
  iconWrapperAmber: {
    backgroundColor: '#FEF3C7',
  },
  iconWrapperBlue: {
    backgroundColor: '#DBEAFE',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 320,
  },
  codeBadge: {
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  codeBadgeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.8,
  },
  codeBadgeValue: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1E40AF',
    marginTop: 2,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  ticketStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ticketStatusEmerald: {
    backgroundColor: '#ECFDF5',
  },
  ticketStatusAmber: {
    backgroundColor: '#FFFBEB',
  },
  ticketStatusBlue: {
    backgroundColor: '#EFF6FF',
  },
  ticketStatusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  ticketLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  ticketValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  ticketTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  ticketFooterBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ticketFooterText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 15,
  },
  actionsContainer: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
});
