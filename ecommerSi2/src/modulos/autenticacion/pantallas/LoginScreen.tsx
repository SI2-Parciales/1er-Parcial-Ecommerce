import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { ShoppingBag, Mail, Lock, ArrowRight, X } from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LoginModal'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('cliente@example.com');
  const [password, setPassword] = useState('Cliente123,');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
    navigation.goBack();
  };

  return (
    <ScreenContainer className="bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          {/* Top Close Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full z-10"
          >
            <X size={20} color="#4B5563" />
          </TouchableOpacity>

          {/* Logo & Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
              <ShoppingBag size={32} color="#FFFFFF" />
            </View>
            <Text className="text-2xl font-black text-gray-900 tracking-tight">
              FashionStore Mobile
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Inicia sesión para reservar probadores y comprar
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Mail size={18} color="#9CA3AF" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ejemplo@correo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Lock size={18} color="#9CA3AF" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.8}
              className="w-full bg-blue-600 py-3.5 rounded-xl items-center justify-center flex-row gap-2 mt-6 shadow-md shadow-blue-500/30"
            >
              <Text className="text-white font-bold text-sm">
                Iniciar Sesión
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="flex-row justify-center items-center gap-1.5 mt-6">
              <Text className="text-xs text-gray-500">¿No tienes cuenta todavía?</Text>
              <TouchableOpacity onPress={() => {
                navigation.replace('RegisterModal');
              }}>
                <Text className="text-xs font-bold text-blue-600">Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
