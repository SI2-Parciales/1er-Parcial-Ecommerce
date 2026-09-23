import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const variantStyles: Record<ButtonVariant, { button: string; text: string; spinner: string }> = {
  primary: {
    button: 'bg-brand-primary active:opacity-90',
    text: 'text-white font-semibold',
    spinner: '#FFFFFF',
  },
  secondary: {
    button: 'bg-brand-secondary active:opacity-80',
    text: 'text-brand-primary font-semibold',
    spinner: '#111827',
  },
  outline: {
    button: 'border border-brand-border bg-transparent active:bg-gray-50',
    text: 'text-brand-primary font-semibold',
    spinner: '#111827',
  },
  danger: {
    button: 'bg-brand-danger active:opacity-90',
    text: 'text-white font-semibold',
    spinner: '#FFFFFF',
  },
};

const sizeStyles: Record<ButtonSize, { button: string; text: string; iconGap: string }> = {
  sm: {
    button: 'py-2 px-3 rounded-lg',
    text: 'text-xs',
    iconGap: 'gap-1.5',
  },
  md: {
    button: 'py-3.5 px-4 rounded-xl',
    text: 'text-sm',
    iconGap: 'gap-2',
  },
  lg: {
    button: 'py-4 px-6 rounded-2xl',
    text: 'text-base',
    iconGap: 'gap-2.5',
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  textClassName = '',
  ...touchableProps
}) => {
  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      className={clsx(
        'flex-row items-center justify-center',
        currentVariant.button,
        currentSize.button,
        isDisabled && 'opacity-50',
        className
      )}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.spinner}
        />
      ) : (
        <View className={clsx('flex-row items-center justify-center', currentSize.iconGap)}>
          {leftIcon && <View>{leftIcon}</View>}
          <Text
            className={clsx(
              'text-center',
              currentVariant.text,
              currentSize.text,
              textClassName
            )}
          >
            {title}
          </Text>
          {rightIcon && <View>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
