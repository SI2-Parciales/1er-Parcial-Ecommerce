import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
} from 'react-native';
import clsx from 'clsx';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  inputClassName = '',
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleFocus: TextInputProps['onFocus'] = (e): void => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur: TextInputProps['onBlur'] = (e): void => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  const hasError = Boolean(error);

  return (
    <View className={clsx('w-full mb-3', containerClassName)}>
      {label && (
        <Text className="text-xs font-medium text-brand-muted mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
      )}

      <View
        className={clsx(
          'flex-row items-center border rounded-xl px-3.5 bg-gray-50/50 min-h-[48px]',
          hasError
            ? 'border-brand-danger bg-red-50/20'
            : isFocused
            ? 'border-brand-accent bg-white shadow-sm'
            : 'border-brand-border'
        )}
      >
        {leftIcon && <View className="mr-2.5 justify-center">{leftIcon}</View>}

        <TextInput
          className={clsx(
            'flex-1 text-brand-primary text-sm py-2.5',
            inputClassName
          )}
          placeholderTextColor="#9CA3AF"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />

        {rightIcon && <View className="ml-2.5 justify-center">{rightIcon}</View>}
      </View>

      {hasError ? (
        <Text className="text-xs text-brand-danger mt-1 font-medium">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-xs text-brand-muted mt-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};
