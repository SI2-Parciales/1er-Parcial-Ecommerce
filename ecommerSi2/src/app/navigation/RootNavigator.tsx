import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RootStackParamList, RootStackScreenProps } from './types';

import { ProductDetailScreen } from '@modulos/catalogo/pantallas/ProductDetailScreen';
import { VirtualTryOnScreen } from '@modulos/probador-virtual/pantallas/VirtualTryOnScreen';
import { FittingBagScreen } from '@modulos/reservas/pantallas/FittingBagScreen';
import { ReservationPassModal } from '@modulos/reservas/componentes/ReservationPassModal';
import { CheckoutScreen } from '@modulos/pago/pantallas/CheckoutScreen';
import { OrderSuccessScreen } from '@modulos/pago/pantallas/OrderSuccessScreen';
import { LoginScreen } from '@modulos/autenticacion/pantallas/LoginScreen';
import { RegisterScreen } from '@modulos/autenticacion/pantallas/RegisterScreen';
import { useFittingBagStore } from '@modulos/reservas/almacen/fittingBag.store';

const Stack = createNativeStackNavigator<RootStackParamList>();

const ReservationPassScreen: React.FC<RootStackScreenProps<'ReservationPassModal'>> = ({
  navigation,
  route,
}) => {
  const { reservationId } = route.params;
  const { reservations } = useFittingBagStore();
  const reservation =
    reservations.find((r) => r.id === reservationId || r.reservationCode === reservationId) || null;

  return (
    <ReservationPassModal
      visible={true}
      reservation={reservation}
      onClose={() => navigation.goBack()}
    />
  );
};

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="VirtualTryOn"
          component={VirtualTryOnScreen}
          options={{
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="FittingBag"
          component={FittingBagScreen}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="ReservationPassModal"
          component={ReservationPassScreen}
          options={{
            presentation: 'transparentModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="OrderSuccess"
          component={OrderSuccessScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="LoginModal"
          component={LoginScreen}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="RegisterModal"
          component={RegisterScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
