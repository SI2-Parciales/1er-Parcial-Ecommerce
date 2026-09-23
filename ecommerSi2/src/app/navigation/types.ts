import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type BottomTabParamList = {
  CatalogTab: undefined;
  ReservationsTab: undefined;
  CartTab: undefined;
  AIAssistantTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  ProductDetail: { productId: string };
  VirtualTryOn: { productId: string; variantId?: string };
  FittingBag: undefined;
  ReservationPassModal: { reservationId: string };
  Checkout: undefined;
  OrderSuccess: { orderId: string; status: 'PAID' | 'PENDING_MANUAL_VERIFICATION' };
  LoginModal: undefined;
  RegisterModal: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type BottomTabTabScreenProps<T extends keyof BottomTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
