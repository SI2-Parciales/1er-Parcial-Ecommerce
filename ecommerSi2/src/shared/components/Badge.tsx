import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const badgeStyles: Record<BadgeVariant, { container: string; text: string }> = {
  success: {
    container: 'bg-emerald-50 border border-emerald-200',
    text: 'text-emerald-700 font-medium',
  },
  warning: {
    container: 'bg-amber-50 border border-amber-200',
    text: 'text-amber-700 font-medium',
  },
  danger: {
    container: 'bg-rose-50 border border-rose-200',
    text: 'text-rose-700 font-medium',
  },
  info: {
    container: 'bg-indigo-50 border border-indigo-200',
    text: 'text-indigo-700 font-medium',
  },
  neutral: {
    container: 'bg-gray-100 border border-gray-200',
    text: 'text-gray-700 font-medium',
  },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string; gap: string }> = {
  sm: {
    container: 'py-0.5 px-2 rounded-full',
    text: 'text-[10px] tracking-wide uppercase',
    gap: 'gap-1',
  },
  md: {
    container: 'py-1 px-2.5 rounded-full',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  textClassName = '',
  ...viewProps
}) => {
  const currentVariant = badgeStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <View
      className={clsx(
        'self-start flex-row items-center justify-center',
        currentVariant.container,
        currentSize.container,
        currentSize.gap,
        className
      )}
      {...viewProps}
    >
      {icon && <View>{icon}</View>}
      <Text
        className={clsx(
          currentVariant.text,
          currentSize.text,
          textClassName
        )}
      >
        {label}
      </Text>
    </View>
  );
};
