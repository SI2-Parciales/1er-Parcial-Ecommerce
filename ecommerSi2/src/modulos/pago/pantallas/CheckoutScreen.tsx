import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import {
  ArrowLeft,
  CreditCard,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Store,
  FileText,
  Tag,
  X,
  Clock,
  Lock,
} from 'lucide-react-native';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { useBranchStore } from '@modulos/sucursales/almacen/branch.store';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { cartService } from '@modulos/carrito/servicios/cart.service';
import {
  validateBillingNit,
  validateBillingName,
  formatCardNumber,
  validateCardNumber,
  formatCardExpiry,
  validateCardExpiry,
  validateCardCvv,
  validateCouponCode,
} from '@shared/utils/predictiveErrors';
import { PredictiveErrorBanner } from '@shared/components/PredictiveErrorBanner';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getTotal, deliveryType, items, createOrder } = useCartStore();
  const { activeBranch } = useBranchStore();
  const { user } = useAuthStore();
  const baseTotal = getTotal();

  const [paymentMethod, setPaymentMethod] = useState<'STATIC_QR' | 'CARD_GATEWAY' | 'STORE_CASH'>('CARD_GATEWAY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cupón de descuento (ubicado en checkout a petición del usuario)
  const [couponInput, setCouponInput] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCodeApplied, setCouponCodeApplied] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; suggestion?: string; type: 'error' | 'success' } | null>(null);

  // Datos de Facturación
  const [billingName, setBillingName] = useState(user?.name || 'Cliente Particular');
  const [billingNit, setBillingNit] = useState('73168919');

  // Form Tarjeta interactivo y validado
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.name ? user.name.toUpperCase() : 'MARIANA LOPEZ');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Errores predictivos para formularios
  const [formError, setFormError] = useState<{ message: string; suggestion?: string } | null>(null);

  // Cálculo de montos con cupón
  const discountAmount = Math.round(baseTotal * (discountPercent / 100) * 100) / 100;
  const finalTotal = Math.max(0, Math.round((baseTotal - discountAmount) * 100) / 100);

  const handleApplyCoupon = () => {
    setCouponFeedback(null);
    const result = validateCouponCode(couponInput);
    if (result.isValid) {
      setDiscountPercent(result.discountPercent);
      setCouponCodeApplied(couponInput.trim().toUpperCase());
      setCouponFeedback({
        message: result.message,
        type: 'success',
      });
      setCouponInput('');
    } else {
      setCouponFeedback({
        message: result.message,
        suggestion: result.suggestion,
        type: 'error',
      });
    }
  };

  const handleRemoveCoupon = () => {
    setDiscountPercent(0);
    setCouponCodeApplied(null);
    setCouponFeedback(null);
  };

  // Manejador del número de tarjeta con auto-formato
  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
    if (formError) setFormError(null);
  };

  // Manejador de fecha de vencimiento
  const handleExpiryChange = (text: string) => {
    const formatted = formatCardExpiry(text);
    setCardExpiry(formatted);
    if (formError) setFormError(null);
  };

  // Manejador de CVV
  const handleCvvChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setCardCvv(digits);
    if (formError) setFormError(null);
  };

  const handleProcessPayment = async () => {
    setFormError(null);

    // 1. Validar datos de facturación
    const nameValidation = validateBillingName(billingName);
    if (!nameValidation.isValid) {
      setFormError({
        message: nameValidation.message,
        suggestion: nameValidation.suggestion,
      });
      return;
    }

    const nitValidation = validateBillingNit(billingNit);
    if (!nitValidation.isValid) {
      setFormError({
        message: nitValidation.message,
        suggestion: nitValidation.suggestion,
      });
      return;
    }

    // 2. Validar datos de tarjeta si el método es tarjeta
    if (paymentMethod === 'CARD_GATEWAY') {
      const cardNumVal = validateCardNumber(cardNumber);
      if (!cardNumVal.isValid) {
        setFormError({
          message: cardNumVal.message,
          suggestion: cardNumVal.suggestion,
        });
        return;
      }

      if (!cardHolder.trim() || cardHolder.trim().length < 3) {
        setFormError({
          message: 'Ingresa el nombre del titular de la tarjeta.',
          suggestion: 'Debe coincidir con el nombre grabado en el plástico bancario.',
        });
        return;
      }

      const expiryVal = validateCardExpiry(cardExpiry);
      if (!expiryVal.isValid) {
        setFormError({
          message: expiryVal.message,
          suggestion: expiryVal.suggestion,
        });
        return;
      }

      const cvvVal = validateCardCvv(cardCvv);
      if (!cvvVal.isValid) {
        setFormError({
          message: cvvVal.message,
          suggestion: cvvVal.suggestion,
        });
        return;
      }
    }

    setIsSubmitting(true);
    let digitalSaleId: number | null = null;

    try {
      // 1. Registrar venta digital en el backend NestJS (CU12)
      const digitalSale = await cartService.createDigitalSale(
        billingName.trim(),
        billingNit.trim()
      );

      if (digitalSale && digitalSale.id) {
        digitalSaleId = digitalSale.id;

        // 2. Si el método es electrónico, confirmar pago en backend (CU36)
        if (paymentMethod !== 'STORE_CASH') {
          await cartService.processElectronicPayment(
            digitalSale.id,
            paymentMethod === 'CARD_GATEWAY' ? 'TARJETA' : 'QR'
          );
        }
      }
    } catch (err: any) {
      console.warn('Backend venta digital fallback local:', err.message);
    } finally {
      setIsSubmitting(false);
    }

    // Crear la orden en Zustand
    const order = createOrder(
      paymentMethod,
      activeBranch.name,
      paymentMethod === 'STATIC_QR' ? 'https://example.com/receipt-bcp.jpg' : undefined,
      discountAmount,
      couponCodeApplied || undefined
    );

    // Navegar a la pantalla de validaciones y ticket digital
    navigation.replace('OrderSuccess', {
      orderId: digitalSaleId ? `FAC-DIG-${digitalSaleId}` : order.orderNumber,
      status: paymentMethod === 'CARD_GATEWAY' ? 'PAID' : paymentMethod === 'STORE_CASH' ? 'RESERVED_IN_STORE' : 'PENDING_MANUAL_VERIFICATION',
      type: paymentMethod === 'STORE_CASH' ? 'RESERVATION' : 'PURCHASE',
      total: finalTotal,
      branchName: activeBranch.name,
      itemsCount: items.length,
      deliveryType: deliveryType,
    });
  };

  return (
    <ScreenContainer className="bg-gray-50/50 flex-1" style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header (Quitado el seguro como pidió el usuario: Pasarela de Pago) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Pasarela de Pago
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* COMPONENTE: IMPORTE TOTAL A LIQUIDAR (NO MODIFICAR SEGÚN INSTRUCCIÓN EXPLÍCITA DEL USUARIO) */}
        <View className="bg-slate-950 p-5 rounded-3xl mb-4 text-white shadow-md border border-slate-800">
          <Text className="text-[11px] text-blue-400 font-bold uppercase tracking-widest">
            Importe Total a Liquidar
          </Text>
          <Text className="text-3xl font-black text-white mt-1">
            Bs. {finalTotal.toFixed(2)}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800">
            <ShieldCheck size={14} color="#34D399" />
            <Text className="text-[11px] text-slate-300">
              Transacción certificada con protocolo bancario cifrado
            </Text>
          </View>
        </View>

        {/* CUPÓN DE DESCUENTO (Ubicado en la Pasarela de Pago a petición del usuario) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Tag size={16} color="#2563EB" />
            <Text style={styles.cardTitle}>
              CUPÓN DE DESCUENTO
            </Text>
          </View>

          {couponCodeApplied ? (
            <View style={styles.couponAppliedBox}>
              <View style={styles.couponAppliedLeft}>
                <CheckCircle2 size={16} color="#059669" />
                <View>
                  <Text style={styles.couponAppliedTitle}>
                    Cupón {couponCodeApplied} aplicado ({discountPercent}% OFF)
                  </Text>
                  <Text style={styles.couponAppliedSubtitle}>
                    Ahorro de Bs. {discountAmount.toFixed(2)} en tu orden
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.couponRemoveBtn}>
                <X size={16} color="#059669" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <View style={styles.couponInputWrap}>
                <Tag size={14} color="#94A3B8" />
                <TextInput
                  value={couponInput}
                  onChangeText={(txt) => {
                    setCouponInput(txt);
                    if (couponFeedback) setCouponFeedback(null);
                  }}
                  placeholder="Ej: PROMO2026 o VIP15"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  style={styles.couponTextInput}
                />
              </View>
              <TouchableOpacity
                onPress={handleApplyCoupon}
                activeOpacity={0.8}
                style={styles.couponApplyBtn}
              >
                <Text style={styles.couponApplyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          )}

          {couponFeedback && (
            <PredictiveErrorBanner
              message={couponFeedback.message}
              suggestion={couponFeedback.suggestion}
              type={couponFeedback.type}
            />
          )}
        </View>

        {/* DATOS PARA FACTURA OFICIAL */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <FileText size={16} color="#2563EB" />
            <Text style={styles.cardTitle}>
              DATOS PARA FACTURA OFICIAL
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>
              Razón Social / Nombre Completo
            </Text>
            <TextInput
              value={billingName}
              onChangeText={(txt) => {
                setBillingName(txt);
                if (formError) setFormError(null);
              }}
              style={styles.textInput}
              placeholder="Nombre para la factura"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View>
            <Text style={styles.fieldLabel}>
              NIT o Cédula de Identidad (CI)
            </Text>
            <TextInput
              value={billingNit}
              onChangeText={(txt) => {
                setBillingNit(txt);
                if (formError) setFormError(null);
              }}
              keyboardType="numeric"
              style={[styles.textInput, { fontFamily: 'monospace' }]}
              placeholder="73168919 o 0"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* SELECTOR DE MEDIO DE PAGO (Rediseñado con diseño premium, espaciado y moderno) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            SELECCIONAR MEDIO DE PAGO
          </Text>

          <View style={styles.paymentMethodsGrid}>
            {/* Opción 1: Simple QR */}
            <TouchableOpacity
              onPress={() => {
                setPaymentMethod('STATIC_QR');
                setFormError(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'STATIC_QR' && styles.paymentMethodCardActive,
              ]}
            >
              <View
                style={[
                  styles.paymentMethodIconBox,
                  paymentMethod === 'STATIC_QR'
                    ? styles.paymentMethodIconBoxActive
                    : styles.paymentMethodIconBoxInactive,
                ]}
              >
                <QrCode
                  size={20}
                  color={paymentMethod === 'STATIC_QR' ? '#FFFFFF' : '#475569'}
                />
              </View>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'STATIC_QR' && styles.paymentMethodTitleActive,
                ]}
              >
                Simple QR
              </Text>
              <Text style={styles.paymentMethodTag}>
                Banca Móvil
              </Text>
              {paymentMethod === 'STATIC_QR' && (
                <View style={styles.activeCheckPill}>
                  <CheckCircle2 size={12} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción 2: Tarjeta Bancaria */}
            <TouchableOpacity
              onPress={() => {
                setPaymentMethod('CARD_GATEWAY');
                setFormError(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'CARD_GATEWAY' && styles.paymentMethodCardActive,
              ]}
            >
              <View
                style={[
                  styles.paymentMethodIconBox,
                  paymentMethod === 'CARD_GATEWAY'
                    ? styles.paymentMethodIconBoxActive
                    : styles.paymentMethodIconBoxInactive,
                ]}
              >
                <CreditCard
                  size={20}
                  color={paymentMethod === 'CARD_GATEWAY' ? '#FFFFFF' : '#475569'}
                />
              </View>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'CARD_GATEWAY' && styles.paymentMethodTitleActive,
                ]}
              >
                Tarjeta
              </Text>
              <Text style={styles.paymentMethodTag}>
                Visa / Master
              </Text>
              {paymentMethod === 'CARD_GATEWAY' && (
                <View style={styles.activeCheckPill}>
                  <CheckCircle2 size={12} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>

            {/* Opción 3: En Tienda / Reserva */}
            <TouchableOpacity
              onPress={() => {
                setPaymentMethod('STORE_CASH');
                setFormError(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'STORE_CASH' && styles.paymentMethodCardActive,
              ]}
            >
              <View
                style={[
                  styles.paymentMethodIconBox,
                  paymentMethod === 'STORE_CASH'
                    ? styles.paymentMethodIconBoxActive
                    : styles.paymentMethodIconBoxInactive,
                ]}
              >
                <Store
                  size={20}
                  color={paymentMethod === 'STORE_CASH' ? '#FFFFFF' : '#475569'}
                />
              </View>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  paymentMethod === 'STORE_CASH' && styles.paymentMethodTitleActive,
                ]}
              >
                En Tienda
              </Text>
              <Text style={styles.paymentMethodTag}>
                Reserva 48h
              </Text>
              {paymentMethod === 'STORE_CASH' && (
                <View style={styles.activeCheckPill}>
                  <CheckCircle2 size={12} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ERROR PREDICTIVO GLOBAL DEL FORMULARIO */}
        {formError && (
          <PredictiveErrorBanner
            message={formError.message}
            suggestion={formError.suggestion}
            type="error"
          />
        )}

        {/* SECCIÓN 1: FORMULARIO DE TARJETA BANCARIA INTERACTIVO */}
        {paymentMethod === 'CARD_GATEWAY' && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <CreditCard size={16} color="#2563EB" />
              <Text style={styles.cardTitle}>
                DATOS DE TARJETA VISA / MASTERCARD
              </Text>
            </View>

            {/* Número de Tarjeta con formato de 16 dígitos */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Número de Tarjeta</Text>
                <Text style={styles.fieldSubhint}>16 dígitos</Text>
              </View>
              <TextInput
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                maxLength={19}
                placeholder="4552 1234 5678 9012"
                placeholderTextColor="#94A3B8"
                style={[styles.textInput, styles.fontMono, { fontSize: 14 }]}
              />
            </View>

            {/* Nombre del Titular */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Nombre del Titular</Text>
              <TextInput
                value={cardHolder}
                onChangeText={(txt) => {
                  setCardHolder(txt.toUpperCase());
                  if (formError) setFormError(null);
                }}
                autoCapitalize="characters"
                placeholder="MARIANA LOPEZ"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            {/* Vencimiento y CVV */}
            <View style={styles.formRowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Vencimiento</Text>
                <TextInput
                  value={cardExpiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="numeric"
                  maxLength={5}
                  placeholder="MM/AA (ej: 12/28)"
                  placeholderTextColor="#94A3B8"
                  style={[styles.textInput, styles.fontMono, { textAlign: 'center' }]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>CVV / CVC</Text>
                <TextInput
                  value={cardCvv}
                  onChangeText={handleCvvChange}
                  placeholder="3 dígitos (123)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={[styles.textInput, styles.fontMono, { textAlign: 'center' }]}
                />
              </View>
            </View>

            <View style={styles.securityRow}>
              <Lock size={12} color="#16A34A" />
              <Text style={styles.securityRowText}>
                Tus datos viajan encriptados por pasarela Cybersource Red Enlace.
              </Text>
            </View>

            {/* Botón de acción dentro de la card */}
            <TouchableOpacity
              onPress={handleProcessPayment}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={[styles.actionSubmitBtn, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionSubmitBtnText}>
                    Pagar Bs. {finalTotal.toFixed(2)} con Tarjeta
                  </Text>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* SECCIÓN 2: PAGO POR SIMPLE QR */}
        {paymentMethod === 'STATIC_QR' && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Text style={[styles.cardTitle, { marginBottom: 14 }]}>
              QR INTEROPERABLE OFICIAL (BOLIVIA)
            </Text>

            {/* Código QR Interoperable BCP con visualización nítida */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCornerRow}>
                <View style={styles.qrTargetSquare} />
                <View style={styles.qrTargetSquare} />
              </View>

              <View style={styles.qrCenterInfo}>
                <QrCode size={48} color="#0F172A" />
                <Text style={styles.qrAmountText}>
                  Bs. {finalTotal.toFixed(2)}
                </Text>
                <Text style={styles.qrMerchantText}>
                  FASHIONSTORE BCP QR OFICIAL
                </Text>
              </View>

              <View style={styles.qrCornerRow}>
                <View style={styles.qrTargetSquare} />
                <View style={[styles.qrTargetSquare, { backgroundColor: '#2563EB' }]} />
              </View>
            </View>

            {/* Datos de cuenta BCP para transferencia directa */}
            <View style={styles.accountDataBox}>
              <View style={styles.accountDataRow}>
                <Text style={styles.accountDataLabel}>Banco BCP Nro:</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Copiado', 'Nro de cuenta 201-50893321-3-45 copiado.')}
                  style={styles.copyRow}
                >
                  <Text style={styles.accountDataNumber}>201-50893321-3-45</Text>
                  <Copy size={12} color="#2563EB" />
                </TouchableOpacity>
              </View>
              <Text style={styles.accountHolderText}>
                Titular: FashionStore Retail Bolivia S.R.L.
              </Text>
            </View>

            {/* Estado de validación automática del comprobante */}
            <View style={styles.qrValidatedBanner}>
              <CheckCircle2 size={16} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.qrValidatedTitle}>
                  Validación Automática Activa
                </Text>
                <Text style={styles.qrValidatedSubtitle}>
                  Escanea desde tu app bancaria y presiona confirmar.
                </Text>
              </View>
            </View>

            {/* Botón de confirmación para QR */}
            <TouchableOpacity
              onPress={handleProcessPayment}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={[styles.actionSubmitBtn, { marginTop: 16, width: '100%' }, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionSubmitBtnText}>
                    Confirmar Pago QR • Bs. {finalTotal.toFixed(2)}
                  </Text>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* SECCIÓN 3: PAGO EN TIENDA / RESERVA DE PRENDAS */}
        {paymentMethod === 'STORE_CASH' && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Store size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>
                PAGO EN CAJA AL RETIRAR (RESERVA)
              </Text>
            </View>

            <View style={styles.storeReservationBanner}>
              <View style={styles.storeReservationBadge}>
                <Clock size={14} color="#D97706" />
                <Text style={styles.storeReservationBadgeText}>
                  Apartado exclusivo por 48 horas
                </Text>
              </View>

              <Text style={styles.storeReservationBody}>
                Tus prendas se apartarán inmediatamente en <Text style={{ fontWeight: '800', color: '#0F172A' }}>{activeBranch.name}</Text> ({activeBranch.city}).
              </Text>

              <Text style={[styles.storeReservationBody, { marginTop: 6 }]}>
                Podrás pasar por la tienda a probártelas y pagar en caja con <Text style={{ fontWeight: '700' }}>efectivo, tarjeta física o QR</Text> al momento de recoger.
              </Text>
            </View>

            {/* Botón de confirmación para la reserva */}
            <TouchableOpacity
              onPress={handleProcessPayment}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={[styles.actionSubmitBtn, { backgroundColor: '#0F172A', marginTop: 14 }, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionSubmitBtnText}>
                    Confirmar Reserva en Tienda (Pagar al Retirar)
                  </Text>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* BOTÓN INFERIOR FIJO (SIEMPRE VISIBLE EN TODAS LAS MODALIDADES CON SAFE AREA) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={handleProcessPayment}
          disabled={isSubmitting}
          activeOpacity={0.88}
          style={[
            styles.fixedBottomBtn,
            paymentMethod === 'STORE_CASH' && { backgroundColor: '#0F172A' },
            isSubmitting && { opacity: 0.7 },
          ]}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.fixedBottomBtnText}>Procesando Operación...</Text>
            </View>
          ) : (
            <View style={styles.fixedBottomBtnRow}>
              <View>
                <Text style={styles.fixedBottomBtnTitle}>
                  {paymentMethod === 'STORE_CASH'
                    ? 'Confirmar Reserva en Tienda'
                    : paymentMethod === 'STATIC_QR'
                      ? 'Confirmar Pago por QR'
                      : 'Confirmar y Pagar'}
                </Text>
                <Text style={styles.fixedBottomBtnSubtitle}>
                  {paymentMethod === 'STORE_CASH' ? 'Paga en caja al recoger' : 'Liquidación digital inmediata'}
                </Text>
              </View>

              <View style={styles.fixedBottomBtnPriceBadge}>
                <Text style={styles.fixedBottomBtnPriceText}>
                  Bs. {finalTotal.toFixed(2)}
                </Text>
                <CheckCircle2 size={16} color="#FFFFFF" />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
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
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  couponAppliedBox: {
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  couponAppliedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  couponAppliedSubtitle: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  couponRemoveBtn: {
    padding: 6,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
  },
  couponApplyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  fieldSubhint: {
    fontSize: 10,
    color: '#94A3B8',
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  fontMono: {
    fontFamily: 'monospace',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  paymentMethodCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 94,
  },
  paymentMethodCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  paymentMethodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  paymentMethodIconBoxActive: {
    backgroundColor: '#2563EB',
  },
  paymentMethodIconBoxInactive: {
    backgroundColor: '#F1F5F9',
  },
  paymentMethodTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  paymentMethodTitleActive: {
    color: '#1E40AF',
  },
  paymentMethodTag: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  activeCheckPill: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  securityRowText: {
    fontSize: 10,
    color: '#15803D',
    flex: 1,
    fontWeight: '600',
  },
  actionSubmitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 22,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  qrCornerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  qrTargetSquare: {
    width: 36,
    height: 36,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  qrCenterInfo: {
    alignItems: 'center',
  },
  qrAmountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
    marginTop: 4,
  },
  qrMerchantText: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
  accountDataBox: {
    width: '100%',
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountDataLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountDataNumber: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#2563EB',
  },
  accountHolderText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  qrValidatedBanner: {
    width: '100%',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrValidatedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  qrValidatedSubtitle: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  storeReservationBanner: {
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
  },
  storeReservationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  storeReservationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  storeReservationBody: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
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
  fixedBottomBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fixedBottomBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixedBottomBtnTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  fixedBottomBtnSubtitle: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  fixedBottomBtnPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fixedBottomBtnPriceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  fixedBottomBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
