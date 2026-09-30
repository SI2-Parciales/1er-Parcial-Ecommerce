import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  QrCode,
  Store,
  Calendar,
  CheckCircle2,
  X,
  Trash2,
  AlertCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { useFittingBagStore } from '../almacen/fittingBag.store';
import type { ClientReservation, FittingBagItem, EstadoReserva } from '../tipos/reserva.types';

interface Props {
  visible: boolean;
  reservation: ClientReservation | null;
  onClose: () => void;
  onReservationUpdated?: () => void;
}

export const ReservationPassModal: React.FC<Props> = ({
  visible,
  reservation,
  onClose,
  onReservationUpdated,
}) => {
  const { quitarPrendaReservaServidor, cancelarReservaServidor } = useFittingBagStore();
  const [loadingAction, setLoadingAction] = useState(false);

  if (!reservation) return null;

  const isPendiente = reservation.status === 'PENDIENTE';
  const isEnProceso = reservation.status === 'EN_PROCESO';
  const isFinalizada = reservation.status === 'FINALIZADA';
  const isCancelada = reservation.status === 'CANCELADA';

  const obtenerBadgeEstado = (estado: EstadoReserva) => {
    switch (estado) {
      case 'PENDIENTE':
        return {
          texto: 'En Espera / Pendiente',
          bg: '#FEF3C7',
          color: '#B45309',
        };
      case 'EN_PROCESO':
        return {
          texto: 'En Preparación por Tienda',
          bg: '#DBEAFE',
          color: '#1E40AF',
        };
      case 'FINALIZADA':
        return {
          texto: 'Atendida / Finalizada',
          bg: '#D1FAE5',
          color: '#065F46',
        };
      case 'CANCELADA':
        return {
          texto: 'Cancelada',
          bg: '#FEE2E2',
          color: '#B91C1C',
        };
      default:
        return {
          texto: String(estado),
          bg: '#F3F4F6',
          color: '#4B5563',
        };
    }
  };

  const badgeInfo = obtenerBadgeEstado(reservation.status);

  // CU-R04: Quitar una prenda de la reserva existente
  const handleQuitarPrenda = (item: FittingBagItem) => {
    if (!item.detalleId || !reservation.backendId) {
      Alert.alert(
        'Modificar Reserva',
        'Esta reserva fue registrada localmente. Solo reservas confirmadas en el servidor pueden sincronizar cambios de prendas.',
      );
      return;
    }

    Alert.alert(
      'Quitar Prenda de la Reserva',
      `¿Deseas quitar "${item.productName}" de tu cita? El stock retenido volverá a estar disponible para otros clientes en la sucursal.`,
      [
        { text: 'Conservar prenda', style: 'cancel' },
        {
          text: 'Sí, quitar prenda',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            const res = await quitarPrendaReservaServidor(reservation.backendId!, item.detalleId!);
            setLoadingAction(false);
            if (res.success) {
              Alert.alert('Prenda Retirada', 'Se quitó la prenda de tu reserva con éxito.');
              if (onReservationUpdated) onReservationUpdated();
            } else {
              Alert.alert('Aviso', res.message || 'No se pudo retirar la prenda.');
            }
          },
        },
      ],
    );
  };

  // CU-R05: Cancelar reserva completa
  const handleCancelarReserva = () => {
    Alert.alert(
      'Cancelar Reserva',
      `¿Estás seguro de cancelar tu reserva ${reservation.reservationCode}? Se liberarán todas las prendas apartadas en ${reservation.branchName}.`,
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar reserva',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            const targetId = reservation.backendId || reservation.id;
            const res = await cancelarReservaServidor(targetId);
            setLoadingAction(false);
            if (res.success) {
              Alert.alert('Reserva Cancelada', 'Tu reserva ha sido cancelada exitosamente.');
              if (onReservationUpdated) onReservationUpdated();
              onClose();
            } else {
              Alert.alert('Aviso', res.message || 'No se pudo cancelar la reserva.');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Botón Cerrar */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={18} color="#475569" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* Encabezado */}
            <View style={styles.headerArea}>
              <View style={styles.iconCircle}>
                <QrCode size={26} color="#2563EB" />
              </View>
              <Text style={styles.headerSubtitle}>
                PASE DIGITAL Y DETALLE DE CITA
              </Text>
              <Text style={styles.headerTitle}>
                {reservation.reservationCode}
              </Text>

              {/* Badge de Estado */}
              <View style={[styles.statusBadge, { backgroundColor: badgeInfo.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badgeInfo.color }]}>
                  {badgeInfo.texto}
                </Text>
              </View>
            </View>

            {/* Visual del Código QR Oficial */}
            <View style={styles.qrCardContainer}>
              <View style={styles.qrInnerBox}>
                <Image
                  source={require('../../../../assets/images/foto-prueba.png')}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrCodeLabel}>
                  Pase Digital: {reservation.reservationCode}
                </Text>
                <Text style={styles.qrStoreLabel}>
                  {reservation.branchName}
                </Text>
              </View>
              <Text style={styles.qrInstructionText}>
                Muestra este pase digital al llegar a la tienda para acceder al probador sin esperas.
              </Text>
            </View>

            {/* Datos de Sucursal y Horario */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Store size={15} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Sucursal Asignada</Text>
                  <Text style={styles.infoValue}>{reservation.branchName}</Text>
                  <Text style={styles.infoSubtext}>{reservation.branchAddress}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={15} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Fecha y Horario de Turno</Text>
                  <Text style={styles.infoValue}>{reservation.scheduledTime}</Text>
                </View>
              </View>
            </View>

            {/* CU-R03: Detalle de Prendas Reservadas */}
            <View style={styles.garmentsSection}>
              <View style={styles.garmentsSectionHeader}>
                <Text style={styles.garmentsSectionTitle}>
                  PRENDAS EN VESTIDOR ({reservation.items.length})
                </Text>
                {isPendiente && (
                  <Text style={styles.garmentsSectionHint}>
                    Puedes quitar prendas si ya no deseas probarte alguna
                  </Text>
                )}
              </View>

              {reservation.items.map((item) => (
                <View key={item.id} style={styles.garmentRow}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.garmentThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.garmentInfo}>
                    <Text style={styles.garmentName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.garmentDetails}>
                      Talla: <Text style={{ fontWeight: '700' }}>{item.sizeName}</Text> • Color: <Text style={{ fontWeight: '700' }}>{item.colorName}</Text>
                    </Text>
                    <Text style={styles.garmentQty}>
                      Cantidad: {item.quantity || 1} {item.quantity === 1 ? 'unidad' : 'unidades'}
                    </Text>
                  </View>

                  {/* CU-R04: Botón para quitar prenda de la reserva pendiente */}
                  {isPendiente && item.detalleId && (
                    <TouchableOpacity
                      onPress={() => handleQuitarPrenda(item)}
                      disabled={loadingAction}
                      style={styles.removeGarmentBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Indicador de carga si hay acción en progreso */}
            {loadingAction && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Sincronizando con el servidor...</Text>
              </View>
            )}

            {/* CU-R05: Botón Cancelar Reserva */}
            {isPendiente && (
              <TouchableOpacity
                onPress={handleCancelarReserva}
                disabled={loadingAction}
                activeOpacity={0.8}
                style={styles.cancelReservationBtn}
              >
                <XCircle size={16} color="#DC2626" />
                <Text style={styles.cancelReservationBtnText}>
                  Cancelar Esta Reserva
                </Text>
              </TouchableOpacity>
            )}

            {/* Botón Cerrar */}
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn} activeOpacity={0.85}>
              <Text style={styles.closeModalBtnText}>Volver a Mis Citas</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    zIndex: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  qrCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  qrInnerBox: {
    width: 220,
    minHeight: 280,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 200,
    height: 240,
    borderRadius: 8,
  },
  qrCodeLabel: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#0F172A',
    marginTop: 6,
  },
  qrStoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  qrInstructionText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
    paddingHorizontal: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  infoSubtext: {
    fontSize: 10,
    color: '#94A3B8',
  },
  garmentsSection: {
    marginBottom: 14,
  },
  garmentsSectionHeader: {
    marginBottom: 8,
  },
  garmentsSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  garmentsSectionHint: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  garmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginBottom: 8,
    gap: 10,
  },
  garmentThumb: {
    width: 44,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  garmentInfo: {
    flex: 1,
  },
  garmentName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  garmentDetails: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  garmentQty: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  removeGarmentBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  cancelReservationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    marginBottom: 10,
  },
  cancelReservationBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  closeModalBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
