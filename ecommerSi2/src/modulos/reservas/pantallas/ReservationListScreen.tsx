/**
 * ============================================================================
 * PANTALLA: MIS RESERVAS PICK & TRY (ReservationListScreen)
 * ============================================================================
 * Implementa los Casos de Uso del Cliente:
 * - CU-R02: Consultar mis reservas (listado filtrado por activas e historial).
 * - CU-R03: Consultar detalle de reserva (mediante modal de pase QR y prendas).
 * - CU-R04: Modificar reserva (permitido en estado PENDIENTE).
 * - CU-R05: Cancelar reserva (permitido en estado PENDIENTE con liberación de stock).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  CalendarClock,
  QrCode,
  XCircle,
  Store,
  Clock,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';
import { useFittingBagStore } from '../almacen/fittingBag.store';
import { ReservationPassModal } from '../componentes/ReservationPassModal';
import type { BottomTabTabScreenProps } from '@app/navigation/types';
import type { ClientReservation, EstadoReserva } from '../tipos/reserva.types';

type Props = Partial<BottomTabTabScreenProps<'ReservationsTab'>>;

export const ReservationListScreen: React.FC<Props> = ({ navigation }) => {
  const {
    reservations,
    items: fittingItems,
    cargarReservasBackend,
    cancelarReservaServidor,
    isLoading,
  } = useFittingBagStore();

  const [activeTab, setActiveTab] = useState<'ACTIVAS' | 'HISTORIAL'>('ACTIVAS');
  const [selectedPass, setSelectedPass] = useState<ClientReservation | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  // Cargar reservas del servidor al montar la pantalla
  useEffect(() => {
    cargarReservasBackend();
  }, [cargarReservasBackend]);

  // Actualizar el pase seleccionado si cambia la lista de reservas
  useEffect(() => {
    if (selectedPass) {
      const encontrada = reservations.find(
        (r) => r.id === selectedPass.id || (selectedPass.backendId && r.backendId === selectedPass.backendId),
      );
      if (encontrada) {
        setSelectedPass(encontrada);
      }
    }
  }, [reservations, selectedPass]);

  const handleRefrescar = useCallback(async () => {
    setRefrescando(true);
    await cargarReservasBackend();
    setRefrescando(false);
  }, [cargarReservasBackend]);

  // Clasificación de reservas según reglas del negocio:
  // Activas: PENDIENTE (espera) y EN_PROCESO (tienda preparando)
  // Historial: FINALIZADA (atendida) y CANCELADA (anulada)
  const reservasActivas = reservations.filter(
    (r) => r.status === 'PENDIENTE' || r.status === 'EN_PROCESO',
  );

  const reservasHistorial = reservations.filter(
    (r) => r.status === 'FINALIZADA' || r.status === 'CANCELADA',
  );

  const listaMostrada = activeTab === 'ACTIVAS' ? reservasActivas : reservasHistorial;

  // CU-R05: Cancelar reserva desde la tarjeta
  const handleCancelar = (reserva: ClientReservation) => {
    if (reserva.status !== 'PENDIENTE') {
      Alert.alert(
        'Operación no disponible',
        'Solo puedes cancelar reservas en estado "En Espera / Pendiente". Si la tienda ya está preparando tus prendas, la cita está en proceso.',
      );
      return;
    }

    Alert.alert(
      'Cancelar Reserva de Probador',
      `¿Estás seguro de cancelar tu turno ${reserva.reservationCode} en la sucursal ${reserva.branchName}?\n\nLas prendas apartadas se liberarán inmediatamente.`,
      [
        { text: 'Mantener turno', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelandoId(reserva.id);
            const targetId = reserva.backendId || reserva.id;
            const res = await cancelarReservaServidor(targetId);
            setCancelandoId(null);

            if (res.success) {
              Alert.alert('Reserva Cancelada', 'Tu cita ha sido cancelada correctamente.');
              await cargarReservasBackend();
            } else {
              Alert.alert(
                'Aviso',
                res.message || 'No fue posible cancelar la reserva en este momento.',
              );
            }
          },
        },
      ],
    );
  };

  const renderBadgeEstado = (estado: EstadoReserva) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <View style={[styles.badgeBase, styles.badgePendiente]}>
            <Text style={styles.badgeTextPendiente}>En Espera / Pendiente</Text>
          </View>
        );
      case 'EN_PROCESO':
        return (
          <View style={[styles.badgeBase, styles.badgeEnProceso]}>
            <Text style={styles.badgeTextEnProceso}>En Preparación</Text>
          </View>
        );
      case 'FINALIZADA':
        return (
          <View style={[styles.badgeBase, styles.badgeFinalizada]}>
            <Text style={styles.badgeTextFinalizada}>Atendida / Finalizada</Text>
          </View>
        );
      case 'CANCELADA':
        return (
          <View style={[styles.badgeBase, styles.badgeCancelada]}>
            <Text style={styles.badgeTextCancelada}>Cancelada</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeBase, styles.badgeDefault]}>
            <Text style={styles.badgeTextDefault}>{String(estado)}</Text>
          </View>
        );
    }
  };

  return (
    <ScreenContainer className="bg-gray-50 flex-1" style={{ flex: 1 }}>
      {/* Encabezado Superior */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerSub}>PROBADOR INTELIGENTE PICK & TRY</Text>
            <Text style={styles.headerTitle}>Mis Reservas de Citas</Text>
          </View>
          <TouchableOpacity
            onPress={handleRefrescar}
            style={styles.refreshIconBtn}
            disabled={refrescando || isLoading}
            activeOpacity={0.7}
          >
            {refrescando ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <RefreshCw size={16} color="#475569" />
            )}
          </TouchableOpacity>
        </View>

        {/* Pestañas de Navegación: Activas vs Historial */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('ACTIVAS')}
            style={[styles.tabButton, activeTab === 'ACTIVAS' && styles.tabButtonActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'ACTIVAS' && styles.tabButtonTextActive,
              ]}
            >
              Activas ({reservasActivas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('HISTORIAL')}
            style={[styles.tabButton, activeTab === 'HISTORIAL' && styles.tabButtonActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'HISTORIAL' && styles.tabButtonTextActive,
              ]}
            >
              Historial ({reservasHistorial.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner Informativo si hay prendas en la bolsa de probador */}
      {fittingItems.length > 0 && navigation && (
        <TouchableOpacity
          onPress={() => navigation.navigate('FittingBag')}
          style={styles.fittingBagBanner}
          activeOpacity={0.85}
        >
          <View style={styles.fittingBagBannerLeft}>
            <View style={styles.fittingBagIconCircle}>
              <Sparkles size={16} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fittingBagBannerTitle}>
                Tienes {fittingItems.length} {fittingItems.length === 1 ? 'prenda' : 'prendas'} en tu Bolsa
              </Text>
              <Text style={styles.fittingBagBannerSub}>
                Toca aquí para elegir sucursal, horario y confirmar tu cita.
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#2563EB" />
        </TouchableOpacity>
      )}

      {/* Lista de Reservas */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefrescar}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        {listaMostrada.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CalendarClock size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'ACTIVAS'
                ? 'No tienes citas de probador activas'
                : 'No tienes citas finalizadas o canceladas'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'ACTIVAS'
                ? 'Reserva tus prendas favoritas desde el catálogo y pruébatelas directamente en tu sucursal más cercana sin filas.'
                : 'Aquí verás el registro histórico de todas las prendas que te probaste o cancelaste.'}
            </Text>

            {navigation && activeTab === 'ACTIVAS' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
                style={styles.emptyActionBtn}
                activeOpacity={0.8}
              >
                <ShoppingBag size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Explorar Catálogo</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          listaMostrada.map((reserva) => {
            const esPendiente = reserva.status === 'PENDIENTE';
            const estaCancelando = cancelandoId === reserva.id;

            return (
              <View key={reserva.id} style={styles.cardContainer}>
                {/* Cabecera de la Tarjeta */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reservationCodeText}>{reserva.reservationCode}</Text>
                    <View style={styles.branchRow}>
                      <Store size={12} color="#64748B" />
                      <Text style={styles.branchNameText} numberOfLines={1}>
                        {reserva.branchName}
                      </Text>
                    </View>
                  </View>
                  {renderBadgeEstado(reserva.status)}
                </View>

                {/* Detalles de Horario y Ubicación */}
                <View style={styles.cardDetailsBox}>
                  <View style={styles.cardDetailRow}>
                    <Clock size={13} color="#2563EB" />
                    <Text style={styles.cardDetailLabel}>
                      Horario de Cita:{' '}
                      <Text style={styles.cardDetailValueBold}>{reserva.scheduledTime}</Text>
                    </Text>
                  </View>

                  <Text style={styles.cardGarmentsCount}>
                    {reserva.items.length}{' '}
                    {reserva.items.length === 1 ? 'prenda apartada' : 'prendas apartadas'} en vestidor
                  </Text>

                  {/* Previsualización horizontal de miniaturas */}
                  {reserva.items.length > 0 && (
                    <View style={styles.thumbsRow}>
                      {reserva.items.slice(0, 4).map((it, idx) => (
                        <Image
                          key={`${it.id}-${idx}`}
                          source={{ uri: it.imageUrl }}
                          style={styles.thumbImage}
                          resizeMode="cover"
                        />
                      ))}
                      {reserva.items.length > 4 && (
                        <View style={styles.moreThumbsBadge}>
                          <Text style={styles.moreThumbsText}>+{reserva.items.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Acciones de la Tarjeta */}
                <View style={styles.cardActionsRow}>
                  {/* CU-R03: Ver Detalle y Pase Digital QR */}
                  <TouchableOpacity
                    onPress={() => setSelectedPass(reserva)}
                    style={styles.qrPassBtn}
                    activeOpacity={0.8}
                  >
                    <QrCode size={15} color="#FFFFFF" />
                    <Text style={styles.qrPassBtnText}>Ver Pase QR y Detalle</Text>
                  </TouchableOpacity>

                  {/* CU-R05: Cancelar Reserva (solo si está PENDIENTE) */}
                  {esPendiente && (
                    <TouchableOpacity
                      onPress={() => handleCancelar(reserva)}
                      disabled={estaCancelando}
                      style={styles.cancelBtn}
                      activeOpacity={0.7}
                    >
                      {estaCancelando ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <XCircle size={15} color="#DC2626" />
                          <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* CU-R03, CU-R04, CU-R05: Modal Oficial de Detalle y Modificación */}
      <ReservationPassModal
        visible={!!selectedPass}
        reservation={selectedPass}
        onClose={() => setSelectedPass(null)}
        onReservationUpdated={async () => {
          await cargarReservasBackend();
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    marginTop: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  fittingBagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fittingBagBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fittingBagIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fittingBagBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  fittingBagBannerSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reservationCodeText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  branchNameText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePendiente: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPendiente: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  badgeEnProceso: {
    backgroundColor: '#DBEAFE',
  },
  badgeTextEnProceso: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  badgeFinalizada: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextFinalizada: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  badgeCancelada: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextCancelada: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
  },
  badgeDefault: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextDefault: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  cardDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetailLabel: {
    fontSize: 12,
    color: '#475569',
  },
  cardDetailValueBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  cardGarmentsCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  thumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  thumbImage: {
    width: 38,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  moreThumbsBadge: {
    width: 38,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumbsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrPassBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  qrPassBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cancelBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
});
