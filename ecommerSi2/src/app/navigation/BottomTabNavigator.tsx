import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ShoppingBag,
  Calendar,
  ShoppingCart,
  Sparkles,
  User,
} from 'lucide-react-native';
import { BottomTabParamList } from './types';
import { CatalogScreen } from '@modulos/catalogo/pantallas/CatalogScreen';
import { ReservationListScreen } from '@modulos/reservas/pantallas/ReservationListScreen';
import { CartScreen } from '@modulos/carrito/pantallas/CartScreen';
import { AIAssistantScreen } from '@modulos/asistente-ia/pantallas/AIAssistantScreen';
import { ProfileScreen } from '@modulos/perfil/pantallas/ProfileScreen';
import { useCartStore } from '@modulos/carrito/almacen/cart.store';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';

import { colores } from '@/constants/theme';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { items: cartItems } = useCartStore();
  const { items: fittingItems } = useFittingBagStore();
  const cartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const fittingCount = fittingItems.length;

  return (
    <Tab.Navigator
      initialRouteName="CatalogTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.barraNavegacion.activo,
        tabBarInactiveTintColor: colores.barraNavegacion.inactivo,
        tabBarStyle: {
          backgroundColor: colores.barraNavegacion.fondo,
          borderTopColor: colores.barraNavegacion.borde,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="CatalogTab"
        component={CatalogScreen}
        options={{
          tabBarLabel: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name="ReservationsTab"
        component={ReservationListScreen}
        options={{
          tabBarLabel: 'Reservas',
          tabBarBadge: fittingCount > 0 ? fittingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#2563EB',
            fontSize: 10,
            color: '#FFFFFF',
          },
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Carrito',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#111827',
            fontSize: 10,
            color: '#FFFFFF',
          },
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name="AIAssistantTab"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: 'Asistente IA',
          tabBarIcon: ({ color, size }) => (
            <Sparkles color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size || 22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
