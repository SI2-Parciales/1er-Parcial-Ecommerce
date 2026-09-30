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
} from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { PredictiveErrorBanner } from '@shared/components/PredictiveErrorBanner';
import { User, Mail, Phone, Lock, ArrowRight, X, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterModal'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
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

    if (!cleanTelefono || !/^\d{8}$/.test(cleanTelefono)) {
      setErrorFeedback({
        message: 'Número de teléfono o celular inválido.',
        suggestion: 'Ingresa un número boliviano válido de 8 dígitos (ej: 70011223).',
      });
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorFeedback({
        message: 'Correo electrónico incompleto o inválido.',
        suggestion: 'Asegúrate de escribir un correo con formato válido (ejemplo: mi.nombre@correo.com).',
      });
      return;
    }

    if (cleanPass.length < 8) {
      setErrorFeedback({
        message: 'La contraseña es demasiado corta.',
        suggestion: 'Por seguridad debe contener al menos 8 caracteres, mayúscula, minúscula, número y símbolo (ej: Cliente123,).',
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
    <ScreenContainer className="bg-white flex-1" style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón Cerrar */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-4 right-4 p-2.5 bg-gray-100 rounded-full z-10"
            activeOpacity={0.7}
          >
            <X size={18} color="#374151" />
          </TouchableOpacity>

          {/* Encabezado */}
          <View className="items-center mb-5 mt-4">
            <View className="flex-row items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full mb-2">
              <Sparkles size={12} color="#2563EB" />
              <Text className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">
                Nuevo Cliente
              </Text>
            </View>
            <Text className="text-2xl font-black text-gray-900 tracking-tight text-center">
              Crear Cuenta
            </Text>
            <Text className="text-xs text-gray-500 mt-1 text-center max-w-xs leading-relaxed">
              Regístrate en la base de datos centralizada para comprar prendas, reservar probadores y sincronizar tus pedidos.
            </Text>
          </View>

          {/* Mensaje de Error Predictivo */}
          {errorFeedback && (
            <PredictiveErrorBanner
              message={errorFeedback.message}
              suggestion={errorFeedback.suggestion}
              type="error"
            />
          )}

          {/* Mensaje de Éxito */}
          {successMessage && (
            <View className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center gap-2">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-xs text-emerald-800 flex-1 font-semibold">{successMessage}</Text>
            </View>
          )}

          {/* Formulario */}
          <View className="space-y-3">
            {/* Nombre y Apellido */}
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre
                </Text>
                <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5">
                  <User size={16} color="#6B7280" />
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. María"
                    className="flex-1 ml-2 text-sm text-gray-900"
                    placeholderTextColor="#9CA3AF"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Apellido
                </Text>
                <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5">
                  <TextInput
                    value={apellido}
                    onChangeText={setApellido}
                    placeholder="Ej. Suárez"
                    className="flex-1 text-sm text-gray-900"
                    placeholderTextColor="#9CA3AF"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Correo Electrónico */}
            <View className="mt-2">
              <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </Text>
              <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5">
                <Mail size={16} color="#6B7280" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="maria@ejemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-2.5 text-sm text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Teléfono */}
            <View className="mt-2">
              <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Teléfono / Celular
              </Text>
              <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5">
                <Phone size={16} color="#6B7280" />
                <TextInput
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="70011223"
                  keyboardType="phone-pad"
                  className="flex-1 ml-2.5 text-sm text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Contraseña */}
            <View className="mt-2">
              <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Contraseña
              </Text>
              <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5">
                <Lock size={16} color="#6B7280" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 8 caracteres (Ej: Cliente123,)"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-2.5 text-sm text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? (
                    <EyeOff size={16} color="#9CA3AF" />
                  ) : (
                    <Eye size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Registrar */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
              className={`w-full py-4 rounded-xl items-center justify-center flex-row gap-2 mt-5 shadow-sm ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600'
              }`}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm">Registrando en backend...</Text>
                </>
              ) : (
                <>
                  <Text className="text-white font-bold text-sm tracking-wide">
                    Crear mi Cuenta de Cliente
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Volver al login */}
            <View className="flex-row justify-center items-center gap-1.5 mt-4">
              <Text className="text-xs text-gray-500">¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.replace('LoginModal')}>
                <Text className="text-xs font-bold text-blue-600">Inicia sesión aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
