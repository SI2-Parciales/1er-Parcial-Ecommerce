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
import { ShoppingBag, Mail, Lock, ArrowRight, X, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginModal'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
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
        suggestion: 'Puedes pulsar en el botón "Llenar Cuenta Cliente" para iniciar sesión con la cuenta de prueba oficial.',
      });
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorFeedback(null);
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

          {/* Logo y Encabezado de Marca */}
          <View className="items-center mb-6 mt-4">
            <View className="w-16 h-16 bg-slate-950 rounded-2xl items-center justify-center shadow-lg mb-3 border border-slate-800">
              <ShoppingBag size={28} color="#FFFFFF" />
            </View>
            <View className="flex-row items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full mb-1">
              <Sparkles size={12} color="#2563EB" />
              <Text className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">
                FashionStore Retail 2026
              </Text>
            </View>
            <Text className="text-2xl font-black text-gray-900 tracking-tight text-center">
              Iniciar Sesión
            </Text>
            <Text className="text-xs text-gray-500 mt-1 text-center max-w-xs leading-relaxed">
              Accede para comprar prendas exclusivas, probarte en Realidad Aumentada y reservar probadores en tienda.
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
          <View className="space-y-3.5">
            <View>
              <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </Text>
              <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-3 focus:border-blue-600">
                <Mail size={18} color="#6B7280" />
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorFeedback) setErrorFeedback(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-2.5 text-sm text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </Text>
              <View className="flex-row items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-3">
                <Lock size={18} color="#6B7280" />
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorFeedback) setErrorFeedback(null);
                  }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-2.5 text-sm text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? (
                    <EyeOff size={18} color="#9CA3AF" />
                  ) : (
                    <Eye size={18} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Principal de Iniciar Sesión */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              className={`w-full py-4 rounded-xl items-center justify-center flex-row gap-2 mt-5 shadow-sm ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600'
              }`}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm">Conectando al servidor...</Text>
                </>
              ) : (
                <>
                  <Text className="text-white font-bold text-sm tracking-wide">
                    Iniciar Sesión
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Accesos Rápidos para Evaluación y Pruebas */}
            <View className="mt-6 pt-5 border-t border-gray-100">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5">
                Acceso Rápido / Cuentas Registradas en Backend
              </Text>
              <View className="flex-row flex-wrap gap-2 justify-center">
                <TouchableOpacity
                  onPress={() => handleFillDemo('cliente@example.com', 'Cliente123,')}
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200/80 rounded-lg flex-row items-center gap-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-[11px] font-bold text-blue-800">👤 Cliente</Text>
                  <Text className="text-[10px] text-blue-600 font-mono">cliente@example.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleFillDemo('juan@example.com', 'JuanSeguro123!')}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg flex-row items-center gap-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-[11px] font-bold text-gray-800">🛍️ Juan</Text>
                  <Text className="text-[10px] text-gray-600 font-mono">juan@example.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleFillDemo('admin@example.com', 'Admin123,')}
                  className="px-3 py-1.5 bg-purple-50 border border-purple-200/80 rounded-lg flex-row items-center gap-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-[11px] font-bold text-purple-900">👑 Admin</Text>
                  <Text className="text-[10px] text-purple-700 font-mono">admin@example.com</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enlace Registro */}
            <View className="flex-row justify-center items-center gap-1.5 mt-5">
              <Text className="text-xs text-gray-500">¿No tienes cuenta todavía?</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.replace('RegisterModal');
                }}
              >
                <Text className="text-xs font-bold text-blue-600">Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
