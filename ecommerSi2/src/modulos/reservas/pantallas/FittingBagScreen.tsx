import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  Store,
  Sparkles,
  ChevronRight,
  MapPin,
  CheckCircle2,
} from 'lucide-react-native';
import { useFittingBagStore } from '../almacen/fittingBag.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { appStorage } from '@shared/storage/mmkv';
import { BranchSelectionModal } from '@modulos/sucursales/componentes/BranchSelectionModal';
import { ReservationPassModal } from '../componentes/ReservationPassModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import type { ClientReservation } from '../tipos/reserva.types';

type Props = NativeStackScreenProps<RootStackParamList, 'FittingBag'>;

const TIME_SLOTS = [
  '10:00 - 10:30',
  '11:30 - 12:00',
  '14:00 - 14:30',
  '15:30 - 16:00',
  '17:00 - 17:30',
  '18:30 - 19:00',
];

const obtenerFechaHoraIso = (fechaTexto: string, franjaHoraria: string): string => {
  const ahora = new Date();
  const fechaBase = new Date();

  if (fechaTexto === 'Mañana') {
    fechaBase.setDate(ahora.getDate() + 1);
  } else if (fechaTexto === 'Pasado mañana') {
    fechaBase.setDate(ahora.getDate() + 2);
  }

  // Extraer hora inicial de la franja (ej: '15:30 - 16:00' -> 15:30)
  const horaInicio = franjaHoraria.split('-')[0]?.trim() || '15:30';
  const [horasStr, minutosStr] = horaInicio.split(':');
  const horas = parseInt(horasStr, 10) || 15;
  const minutos = parseInt(minutosStr, 10) || 30;

  fechaBase.setHours(horas, minutos, 0, 0);
  return fechaBase.toISOString();
};

export const FittingBagScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    items,
    removeItem,
    clearBag,
    confirmarReservaServidor,
    isLoading,
  } = useFittingBagStore();
  const { activeBranch, openSelectionModal } = useBranchStore();

  const [selectedDate, setSelectedDate] = useState('Hoy');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[3]);
  const [createdPass, setCreatedPass] = useState<ClientReservation | null>(null);

  // CU-R01: Confirmar reserva conectada con el Backend NestJS
  const handleConfirm = async () => {
    const user = useAuthStore.getState().user;
    const token = appStorage.getString('access_token');
    if (!user || !token) {
      Alert.alert(
        'Iniciar Sesión Requerido',
        'Para agendar y confirmar tu cita de probador debes iniciar sesión con tu cuenta de cliente.',
        [
          { text: 'Registrarme', onPress: () => navigation.navigate('RegisterModal') },
          { text: 'Iniciar Sesión', onPress: () => navigation.navigate('LoginModal') },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Bolsa Vacía', 'Agrega al menos una prenda para agendar tu cita de probador.');
      return;
    }

    const fechaHoraIso = obtenerFechaHoraIso(selectedDate, selectedSlot);
    const resultado = await confirmarReservaServidor(
      activeBranch.id,
      activeBranch.name,
      activeBranch.address,
      fechaHoraIso,
    );

    if (resultado.success && resultado.reservation) {
      setCreatedPass(resultado.reservation);
    } else {
      Alert.alert(
        'Aviso de Reserva',
        resultado.message || 'No se pudo registrar la reserva en este momento.',
      );
    }
  };

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            Bolsa de Probador Pick & Try
          </Text>
          <Text style={styles.headerSubtitle}>
            {items.length} de 5 prendas seleccionadas
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Capacidad / Cupo Bar */}
        <View style={styles.card}>
          <View style={styles.capacityHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#2563EB" />
              <Text style={styles.capacityTitle}>
                Cupo de Probador Físico
              </Text>
            </View>
            <Text style={styles.capacityCount}>
              {items.length} / 5
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (items.length / 5) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.capacityHint}>
            Regla de atención: máximo 5 prendas por turno para asegurar vestidores disponibles sin demoras.
          </Text>
        </View>

        {/* Selected Items */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              PRENDAS A PROBAR ({items.length})
            </Text>
            {items.length > 0 && (
              <TouchableOpacity onPress={clearBag}>
                <Text style={styles.clearBagBtnText}>Vaciar Bolsa</Text>
              </TouchableOpacity>
            )}
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tu bolsa de probador está vacía.</Text>
              <Text style={styles.emptySubtext}>
                Explora el catálogo o pruébate prendas en Realidad Aumentada para añadirlas a tu cita.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
                style={styles.exploreCatalogBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreCatalogBtnText}>Ver Catálogo de Prendas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.garmentCard}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.garmentImage}
                  resizeMode="cover"
                />
                <View style={styles.garmentInfo}>
                  <Text style={styles.garmentName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.garmentMeta}>
                    Talla: <Text style={{ fontWeight: '700' }}>{item.sizeName}</Text> • Color: <Text style={{ fontWeight: '700' }}>{item.colorName}</Text>
                  </Text>
                  <Text style={styles.garmentSku}>
                    SKU: {item.sku || 'N/A'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Sucursal de Retiro / Prueba */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            SUCURSAL SELECCIONADA
          </Text>

          <View style={styles.branchBox}>
            <View style={styles.branchIconCircle}>
              <Store size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.branchName}>
                {activeBranch.name}
              </Text>
              <Text style={styles.branchAddress}>
                {activeBranch.address} ({activeBranch.city})
              </Text>
              <Text style={styles.branchFittingCount}>
                {activeBranch.fittingRoomsCount} vestidores inteligentes habilitados
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={openSelectionModal}
            activeOpacity={0.7}
            style={styles.changeBranchBtn}
          >
            <MapPin size={13} color="#2563EB" />
            <Text style={styles.changeBranchBtnText}>Cambiar Sucursal de Cita</Text>
            <ChevronRight size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Cita y Horario (CU-R01) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Clock size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>
              HORARIO APROXIMADO DE ATENCIÓN
            </Text>
          </View>

          {/* Date Selector */}
          <View style={styles.dateSelectorRow}>
            {['Hoy', 'Mañana', 'Pasado mañana'].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDate(d)}
                style={[
                  styles.dateOptionBtn,
                  selectedDate === d && styles.dateOptionBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateOptionBtnText,
                    selectedDate === d && styles.dateOptionBtnTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Slots Grid */}
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  style={[
                    styles.slotBtn,
                    isSelected && styles.slotBtnActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.slotBtnText,
                      isSelected && styles.slotBtnTextActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.88}
          disabled={items.length === 0 || isLoading}
          style={[
            styles.confirmBtn,
            (items.length === 0 || isLoading) && { opacity: 0.6 },
          ]}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Apartando prendas en servidor...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.confirmBtnText}>
                Confirmar Reserva Pick & Try
              </Text>
              <CheckCircle2 size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Pase QR y Detalle Oficial */}
      <ReservationPassModal
        visible={!!createdPass}
        reservation={createdPass}
        onClose={() => {
          setCreatedPass(null);
          navigation.navigate('MainTabs', { screen: 'ReservationsTab' });
        }}
      />

      {/* Modal de Selección de Sucursales */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  capacityCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  capacityHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  clearBagBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  emptySubtext: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  exploreCatalogBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  exploreCatalogBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  garmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 12,
  },
  garmentImage: {
    width: 60,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  garmentInfo: {
    flex: 1,
  },
  garmentName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  garmentMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  garmentSku: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#94A3B8',
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  branchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  branchAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  branchFittingCount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  changeBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  changeBranchBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateOptionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  dateOptionBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dateOptionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dateOptionBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  slotBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  slotBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  slotBtnTextActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
