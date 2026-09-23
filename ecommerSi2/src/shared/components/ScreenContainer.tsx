import React from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  StatusBarStyle,
  StyleProp,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import clsx from 'clsx';
import { colores } from '@/constants/theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  statusBarStyle?: StatusBarStyle;
  statusBarBg?: string;
  className?: string;
  contentContainerClassName?: string;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scrollViewProps?: Omit<ScrollViewProps, 'children'>;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  statusBarStyle = 'dark-content',
  statusBarBg = colores.fondo,
  className = '',
  contentContainerClassName = '',
  style,
  edges = ['top', 'left', 'right'],
  scrollViewProps,
}) => {
  return (
    <SafeAreaView
      edges={edges}
      className={clsx('flex-1 bg-white', className)}
      style={[{ flex: 1, backgroundColor: statusBarBg || '#FFFFFF' }, style]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBg}
      />
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          className={clsx('flex-1', className)}
          contentContainerClassName={clsx('grow', contentContainerClassName)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} className={clsx('flex-1', contentContainerClassName)}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};
