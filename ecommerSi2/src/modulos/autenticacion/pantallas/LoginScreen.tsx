import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { PredictiveErrorBanner } from '@shared/components/PredictiveErrorBanner';
import {
  ShoppingBag,
  Mail,
  Lock,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginModal'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('cliente@example.com');
  const [password, setPassword] = useState('Cliente123,');
  const [showPassword, setShowPassword] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<{ message: string; suggestion?: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorFeedback(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setErrorFeedback({
        message: 'Ingresa tu correo electrónico.',
        suggestion: 'Es necesario para identificar tu cuenta y cargar tus compras.',
      });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorFeedback({
        message: 'Formato de correo electrónico no válido.',
        suggestion: 'Verifica escribir un correo con formato válido (ejemplo: cliente@example.com).',
      });
      return;
    }

    if (!cleanPass) {
      setErrorFeedback({
        message: 'Ingresa tu contraseña.',
        suggestion: 'Si olvidaste tu contraseña puedes contactar a soporte.',
      });
      return;
    }

    const res = await login(cleanEmail, cleanPass);
    if (res.success) {
      setSuccessMessage('¡Inicio de sesión exitoso! Bienvenido.');
      setTimeout(() => {
        navigation.goBack();
      }, 700);
    } else {
      setErrorFeedback({
        message: res.message || 'Credenciales incorrectas o cuenta no registrada.',
        suggestion: 'Puedes pulsar en el botón de abajo "Cliente" para autocompletar la cuenta oficial del backend.',
      });
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorFeedback(null);
  };

  return (
    <ScreenContainer style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + 8,
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón Cerrar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Logo y Encabezado de Marca */}
          <View style={styles.headerBox}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../../../assets/logo-clean.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTag}>
              <Sparkles size={13} color="#2563EB" />
              <Text style={styles.brandTagText}>FashionStore Retail 2026</Text>
            </View>
            <Text style={styles.titleText}>Iniciar Sesión</Text>
            <Text style={styles.subtitleText}>
              Accede para comprar prendas exclusivas, probarte en Realidad Aumentada y reservar probadores en tienda.
            </Text>
          </View>

          {/* Mensajes de Estado */}
          {errorFeedback && (
            <View style={styles.bannerSpacing}>
              <PredictiveErrorBanner
                message={errorFeedback.message}
                suggestion={errorFeedback.suggestion}
                type="error"
              />
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={18} color="#059669" />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}

          {/* Campos del Formulario */}
          <View style={styles.formContainer}>
            {/* Input Correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#64748B" />
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorFeedback) setErrorFeedback(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInputField}
                  placeholderTextColor="#94A3B8"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Input Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorFeedback) setErrorFeedback(null);
                  }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  style={styles.textInputField}
                  placeholderTextColor="#94A3B8"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* BOTÓN PRINCIPAL DE INICIAR SESIÓN (ALTO CONTRASTE Y SIEMPRE VISIBLE) */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
              style={[
                styles.primaryBtn,
                isLoading && styles.primaryBtnDisabled,
              ]}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Conectando con el servidor...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Accesos Rápidos Oficiales para Pruebas */}
            <View style={styles.quickAccessSection}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>CUENTAS REGISTRADAS EN BACKEND</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.demoChipsRow}>
                <TouchableOpacity
                  onPress={() => handleFillDemo('cliente@example.com', 'Cliente123,')}
                  style={[styles.demoChip, styles.demoChipBlue]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.demoChipTitle}>👤 Cliente</Text>
                  <Text style={styles.demoChipSubtitle}>cliente@example.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleFillDemo('juan@example.com', 'JuanSeguro123!')}
                  style={[styles.demoChip, styles.demoChipSlate]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.demoChipTitle}>🛍️ Juan</Text>
                  <Text style={styles.demoChipSubtitle}>juan@example.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleFillDemo('admin@example.com', 'Admin123,')}
                  style={[styles.demoChip, styles.demoChipPurple]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.demoChipTitle}>👑 Admin</Text>
                  <Text style={styles.demoChipSubtitle}>admin@example.com</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enlace para Ir a Registro */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>¿No tienes cuenta todavía?</Text>
              <TouchableOpacity
                onPress={() => navigation.replace('RegisterModal')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 68,
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  brandTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 290,
  },
  bannerSpacing: {
    marginBottom: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  textInputField: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickAccessSection: {
    marginTop: 22,
    paddingTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  demoChip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  demoChipBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  demoChipSlate: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  demoChipPurple: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  demoChipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  demoChipSubtitle: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748B',
    marginTop: 1,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
});
