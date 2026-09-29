import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Store,
  Truck,
  CheckCircle2,
  X,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { useCartStore } from '../almacen/cart.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { BranchSelectionModal } from '@modulos/sucursales/componentes/BranchSelectionModal';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from '@app/navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'CartTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const CartScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    items,
    deliveryType,
    updateQuantity,
    removeItem,
    clearCart,
    setDeliveryType,
    getSubtotal,
    getShippingCost,
    getTotal,
  } = useCartStore();
  const { activeBranch, openSelectionModal } = useBranchStore();

  const subtotal = getSubtotal();
  const shipping = deliveryType === 'PICKUP_IN_STORE' ? 0 : getShippingCost();
  const finalTotal = getTotal();

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            BOLSA DE COMPRAS DIGITAL
          </Text>
          <Text style={styles.headerTitle}>
            Mi Carrito ({items.length} {items.length === 1 ? 'prenda' : 'prendas'})
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Vaciar Carrito', '¿Deseas quitar todas las prendas de tu bolsa?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Vaciar', style: 'destructive', onPress: () => clearCart() },
              ]);
            }}
            style={styles.trashBtn}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Carrito Vacío */}
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={38} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>
              Tu bolsa de compras está vacía
            </Text>
            <Text style={styles.emptySubtitle}>
              Descubre nuestra nueva colección 2026, pruébate prendas en Realidad Aumentada o reserva un turno de vestidor.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CatalogTab')}
              activeOpacity={0.85}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Explorar Catálogo</Text>
              <ArrowRight size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Lista de Prendas */}
            <View style={{ marginBottom: 16 }}>
              {items.map((item) => (
                <View key={item.variantId} style={styles.garmentCard}>
                  {/* Clic en card para ir a la vista de la prenda */}
                  <TouchableOpacity
                    style={styles.garmentInfoTouchable}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
                    activeOpacity={0.75}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.garmentImage}
                      resizeMode="cover"
                    />

                    <View style={styles.garmentDetails}>
                      <View>
                        <Text style={styles.garmentName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.garmentMeta}>
                          Talla: <Text style={styles.garmentMetaBold}>{item.sizeName}</Text> • Color: <Text style={styles.garmentMetaBold}>{item.colorName}</Text>
                        </Text>
                      </View>

                      <View style={styles.garmentPriceRow}>
                        <Text style={styles.garmentPrice}>
                          Bs. {(item.price * item.quantity).toFixed(2)}
                        </Text>
                        <Text style={styles.garmentUnitHint}>
                          (Bs. {item.price.toFixed(2)} c/u)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Acciones de cantidad y eliminar */}
                  <View style={styles.garmentActionsColumn}>
                    <TouchableOpacity
                      onPress={() => removeItem(item.variantId)}
                      style={styles.removeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      <X size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Contador de Cantidad */}
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.variantId, item.quantity - 1)}
                        style={styles.stepperBtn}
                      >
                        <Minus size={13} color="#334155" />
                      </TouchableOpacity>

                      <Text style={styles.stepperText}>
                        {item.quantity}
                      </Text>

                      <TouchableOpacity
                        onPress={() => updateQuantity(item.variantId, item.quantity + 1)}
                        style={styles.stepperBtn}
                      >
                        <Plus size={13} color="#334155" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Modalidad de Entrega (Robusto, sin deformaciones) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>
                MODALIDAD DE ENTREGA
              </Text>

              {/* Opción 1: Retiro en Tienda Física */}
              <TouchableOpacity
                onPress={() => setDeliveryType('PICKUP_IN_STORE')}
                activeOpacity={0.8}
                style={[
                  styles.deliveryOption,
                  deliveryType === 'PICKUP_IN_STORE' && styles.deliveryOptionActive,
                ]}
              >
                <View style={styles.deliveryOptionLeft}>
                  <View
                    style={[
                      styles.deliveryIconBox,
                      deliveryType === 'PICKUP_IN_STORE'
                        ? styles.deliveryIconBoxActive
                        : styles.deliveryIconBoxInactive,
                    ]}
                  >
                    <Store
                      size={20}
                      color={deliveryType === 'PICKUP_IN_STORE' ? '#FFFFFF' : '#475569'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.deliveryTitleRow}>
                      <Text style={styles.deliveryTitleText}>
                        Retiro en Tienda Física
                      </Text>
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>GRATIS</Text>
                      </View>
                    </View>
                    <Text style={styles.deliverySubtitleText} numberOfLines={1}>
                      {activeBranch.name} • {activeBranch.city}
                    </Text>
                  </View>
                </View>

                {deliveryType === 'PICKUP_IN_STORE' && (
                  <CheckCircle2 size={18} color="#2563EB" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>

              {/* Botón Cambiar Sucursal cuando está seleccionado retiro */}
              {deliveryType === 'PICKUP_IN_STORE' && (
                <View style={styles.branchSelectorBar}>
                  <View style={styles.branchInfoRow}>
                    <MapPin size={13} color="#2563EB" />
                    <Text style={styles.branchSelectedText} numberOfLines={1}>
                      Sucursal: <Text style={{ fontWeight: '800' }}>{activeBranch.name}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={openSelectionModal}
                    activeOpacity={0.7}
                    style={styles.changeBranchBtn}
                  >
                    <Text style={styles.changeBranchBtnText}>Cambiar Sucursal</Text>
                    <ChevronRight size={12} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Opción 2: Envío a Domicilio */}
              <TouchableOpacity
                onPress={() => setDeliveryType('HOME_DELIVERY')}
                activeOpacity={0.8}
                style={[
                  styles.deliveryOption,
                  { marginTop: 10 },
                  deliveryType === 'HOME_DELIVERY' && styles.deliveryOptionActive,
                ]}
              >
                <View style={styles.deliveryOptionLeft}>
                  <View
                    style={[
                      styles.deliveryIconBox,
                      deliveryType === 'HOME_DELIVERY'
                        ? styles.deliveryIconBoxActive
                        : styles.deliveryIconBoxInactive,
                    ]}
                  >
                    <Truck
                      size={20}
                      color={deliveryType === 'HOME_DELIVERY' ? '#FFFFFF' : '#475569'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.deliveryTitleRow}>
                      <Text style={styles.deliveryTitleText}>
                        Envío Express a Domicilio
                      </Text>
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>Bs. 20.00</Text>
                      </View>
                    </View>
                    <Text style={styles.deliverySubtitleText}>
                      Entrega asegurada en 24 a 48 horas hábiles
                    </Text>
                  </View>
                </View>

                {deliveryType === 'HOME_DELIVERY' && (
                  <CheckCircle2 size={18} color="#2563EB" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>

            {/* RESUMEN DE LA ORDEN (Con desglose prenda por prenda según lo solicitado) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>
                RESUMEN DE LA ORDEN
              </Text>

              {/* Encabezado de la tabla de prendas */}
              <View style={styles.orderSummaryHeaderRow}>
                <Text style={[styles.orderSummaryHeaderCell, { flex: 2 }]}>Prenda</Text>
                <Text style={[styles.orderSummaryHeaderCell, { width: 55, textAlign: 'center' }]}>Cant.</Text>
                <Text style={[styles.orderSummaryHeaderCell, { flex: 1, textAlign: 'right' }]}>Precio</Text>
              </View>

              {/* Lista prenda por prenda */}
              <View style={{ marginVertical: 4 }}>
                {items.map((item) => (
                  <View key={item.variantId} style={styles.summaryItemRow}>
                    <View style={{ flex: 2, paddingRight: 6 }}>
                      <Text style={styles.summaryItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.summaryItemVariant}>
                        {item.sizeName} / {item.colorName}
                      </Text>
                    </View>

                    <Text style={styles.summaryItemQuantity}>
                      {item.quantity}
                    </Text>

                    <Text style={styles.summaryItemPrice}>
                      Bs. {(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              {/* Subtotal de prendas */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal de prendas</Text>
                <Text style={styles.summaryValue}>
                  Bs. {subtotal.toFixed(2)}
                </Text>
              </View>

              {/* Costo de entrega */}
              <View style={[styles.summaryRow, { marginTop: 6 }]}>
                <Text style={styles.summaryLabel}>Costo de la entrega</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    shipping === 0 ? { color: '#059669', fontWeight: '800' } : null,
                  ]}
                >
                  {shipping === 0 ? 'Gratis' : `Bs. ${shipping.toFixed(2)}`}
                </Text>
              </View>

              <View style={[styles.divider, { marginVertical: 12 }]} />

              {/* TOTAL A PAGAR (Mantiene el diseño grande y claro preferido por el usuario) */}
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
                  <Text style={styles.totalTaxHint}>Incluye impuestos de ley</Text>
                </View>
                <Text style={styles.totalAmount}>
                  Bs. {finalTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Botón Inferior Continuar al Pago (Visible, elevado y con soporte para safe areas) */}
      {items.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Checkout')}
            activeOpacity={0.88}
            style={styles.checkoutBtn}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutBtnTitle}>
                Continuar al Pago
              </Text>
              <Text style={styles.checkoutBtnSubtitle}>
                {deliveryType === 'PICKUP_IN_STORE' ? 'Retiro en sucursal' : 'Envío a domicilio'}
              </Text>
            </View>
            <View style={styles.checkoutBtnAmountBox}>
              <Text style={styles.checkoutBtnAmount}>
                Bs. {finalTotal.toFixed(2)}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de selección de sucursales */}
      <BranchSelectionModal />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  trashBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    backgroundColor: '#EFF6FF',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 13,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  garmentCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  garmentInfoTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  garmentImage: {
    width: 76,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  garmentDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  garmentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  garmentMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  garmentMetaBold: {
    fontWeight: '700',
    color: '#334155',
  },
  garmentPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  garmentPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  garmentUnitHint: {
    fontSize: 10,
    color: '#94A3B8',
  },
  garmentActionsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 86,
    paddingLeft: 4,
  },
  removeBtn: {
    padding: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center',
  },
  sectionCard: {
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
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  deliveryOption: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
  },
  deliveryOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  deliveryOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconBoxActive: {
    backgroundColor: '#2563EB',
  },
  deliveryIconBoxInactive: {
    backgroundColor: '#F1F5F9',
  },
  deliveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
  },
  paidBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563EB',
  },
  deliverySubtitleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  branchSelectorBar: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    paddingRight: 6,
  },
  branchSelectedText: {
    fontSize: 11,
    color: '#334155',
  },
  changeBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  changeBranchBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  orderSummaryHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  orderSummaryHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryItemVariant: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  summaryItemQuantity: {
    width: 55,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  summaryItemPrice: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  totalTaxHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
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
  checkoutBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  checkoutBtnSubtitle: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  checkoutBtnAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  checkoutBtnAmount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
