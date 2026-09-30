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
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterModal'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register, isLoading } = useAuthStore();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('70011223');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Cliente123,');
  const [showPassword, setShowPassword] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<{ message: string; suggestion?: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorFeedback(null);
    setSuccessMessage(null);

    const cleanNombre = nombre.trim();
    const cleanApellido = apellido.trim();
    const cleanTelefono = telefono.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanNombre || cleanNombre.length < 2) {
      setErrorFeedback({
        message: 'Ingresa tu nombre completo.',
        suggestion: 'El nombre debe tener al menos 2 caracteres.',
      });
      return;
    }

    if (!cleanApellido || cleanApellido.length < 2) {
      setErrorFeedback({
        message: 'Ingresa tus apellidos.',
        suggestion: 'Requerido para la emisión correcta de tus comprobantes.',
      });
      return;
    }

    if (!cleanTelefono || !/^\d{7,12}$/.test(cleanTelefono)) {
      setErrorFeedback({
        message: 'Número de teléfono o celular inválido.',
        suggestion: 'Ingresa un número telefónico válido (ej: 70011223).',
      });
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorFeedback({
        message: 'Correo electrónico incompleto o inválido.',
        suggestion: 'Asegúrate de escribir un correo con formato válido (ejemplo: cliente@correo.com).',
      });
      return;
    }

    if (cleanPass.length < 8) {
      setErrorFeedback({
        message: 'La contraseña debe tener al menos 8 caracteres.',
        suggestion: 'Por seguridad debe contener mayúscula, minúscula, número y símbolo (ej: Cliente123,).',
      });
      return;
    }

    const res = await register({
      nombre: cleanNombre,
      apellido: cleanApellido,
      telefono: cleanTelefono,
      email: cleanEmail,
      password: cleanPass,
    });

    if (res.success) {
      setSuccessMessage('¡Cuenta creada exitosamente en el servidor! Bienvenido.');
      setTimeout(() => {
        navigation.goBack();
      }, 800);
    } else {
      setErrorFeedback({
        message: res.message || 'No se pudo crear la cuenta en el servidor.',
        suggestion: 'Es posible que este correo ya esté registrado. Intenta iniciar sesión.',
      });
    }
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
              paddingBottom: Math.max(insets.bottom, 24) + 28,
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

          {/* Encabezado */}
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
              <Text style={styles.brandTagText}>Nuevo Cliente FashionStore</Text>
            </View>
            <Text style={styles.titleText}>Crear Cuenta</Text>
            <Text style={styles.subtitleText}>
              Regístrate para comprar prendas exclusivas, reservar citas de probador y acceder al probador de Realidad Aumentada.
            </Text>
          </View>

          {/* Mensajes de Feedback */}
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

          {/* Formulario de Registro */}
          <View style={styles.formContainer}>
            {/* Nombre y Apellido en fila */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>NOMBRE</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#64748B" />
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. Carlos"
                    style={styles.textInputField}
                    placeholderTextColor="#94A3B8"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>APELLIDO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={apellido}
                    onChangeText={setApellido}
                    placeholder="Ej. Méndez"
                    style={[styles.textInputField, { marginLeft: 0 }]}
                    placeholderTextColor="#94A3B8"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Correo Electrónico */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#64748B" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu.correo@ejemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInputField}
                  placeholderTextColor="#94A3B8"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Teléfono / Celular */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TELÉFONO / CELULAR</Text>
              <View style={styles.inputWrapper}>
                <Phone size={16} color="#64748B" />
                <TextInput
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="70011223"
                  keyboardType="phone-pad"
                  style={styles.textInputField}
                  placeholderTextColor="#94A3B8"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color="#64748B" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 8 caracteres (Ej: Cliente123,)"
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
                    <EyeOff size={16} color="#64748B" />
                  ) : (
                    <Eye size={16} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Nota de Requisito de Seguridad */}
            <View style={styles.securityHintBox}>
              <ShieldCheck size={14} color="#15803D" />
              <Text style={styles.securityHintText}>
                La contraseña debe contener mayúscula, minúscula, número y símbolo.
              </Text>
            </View>

            {/* BOTÓN PRINCIPAL DE REGISTRO (SIEMPRE VISIBLE, SÓLIDO Y DESTACADO) */}
            <TouchableOpacity
              onPress={handleRegister}
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
                  <Text style={styles.primaryBtnText}>Registrando cuenta en servidor...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Crear mi Cuenta de Cliente</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Volver a Iniciar Sesión */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
              <TouchableOpacity
                onPress={() => navigation.replace('LoginModal')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Inicia sesión aquí</Text>
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
    marginBottom: 18,
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
    marginBottom: 8,
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
    maxWidth: 300,
  },
  bannerSpacing: {
    marginBottom: 14,
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
    marginBottom: 14,
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
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    marginBottom: 12,
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
    height: 50,
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
  securityHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 14,
    marginTop: 2,
  },
  securityHintText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
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
