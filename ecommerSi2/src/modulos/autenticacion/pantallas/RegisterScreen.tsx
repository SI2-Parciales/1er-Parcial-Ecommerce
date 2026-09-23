import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { User, Mail, Phone, Lock, ArrowRight, X } from 'lucide-react-native';
import { useAuthStore } from '../almacen/auth.store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterModal'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+591 7');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor llena todos los campos obligatorios.');
      return;
    }
    register(name, email, phone);
    Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente.');
    navigation.goBack();
  };

  return (
    <ScreenContainer className="bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full z-10"
          >
            <X size={20} color="#4B5563" />
          </TouchableOpacity>

          <View className="items-center mb-6">
            <Text className="text-2xl font-black text-gray-900 tracking-tight">
              Crear Cuenta
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              Únete a FashionStore para vestidor virtual AR y reservas de probador en tienda
            </Text>
          </View>

          <View className="space-y-3">
            <View>
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nombre Completo
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <User size={18} color="#9CA3AF" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Andrea Morales"
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <View className="mt-2">
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Mail size={18} color="#9CA3AF" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="andrea@ejemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <View className="mt-2">
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Celular de Contacto
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Phone size={18} color="#9CA3AF" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+591 70011223"
                  keyboardType="phone-pad"
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <View className="mt-2">
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Contraseña
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Lock size={18} color="#9CA3AF" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  className="flex-1 ml-2 text-sm text-gray-900"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              activeOpacity={0.8}
              className="w-full bg-blue-600 py-3.5 rounded-xl items-center justify-center flex-row gap-2 mt-6 shadow-md shadow-blue-500/30"
            >
              <Text className="text-white font-bold text-sm">
                Completar Registro
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="flex-row justify-center items-center gap-1.5 mt-4">
              <Text className="text-xs text-gray-500">¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.replace('LoginModal')}>
                <Text className="text-xs font-bold text-blue-600">Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
