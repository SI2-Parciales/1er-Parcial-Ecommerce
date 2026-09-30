import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react-native';

interface PredictiveErrorBannerProps {
  message?: string | null;
  suggestion?: string | null;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export const PredictiveErrorBanner: React.FC<PredictiveErrorBannerProps> = ({
  message,
  suggestion,
  type = 'error',
}) => {
  if (!message) return null;

  const isError = type === 'error';
  const isWarning = type === 'warning';
  const isSuccess = type === 'success';

  const bgColor = isError ? '#FEF2F2' : isWarning ? '#FFFBEB' : isSuccess ? '#ECFDF5' : '#EFF6FF';
  const borderColor = isError ? '#FCA5A5' : isWarning ? '#FDE68A' : isSuccess ? '#A7F3D0' : '#BFDBFE';
  const textColor = isError ? '#991B1B' : isWarning ? '#92400E' : isSuccess ? '#065F46' : '#1E40AF';
  const subtextColor = isError ? '#B91C1C' : isWarning ? '#B45309' : isSuccess ? '#047857' : '#2563EB';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {isSuccess ? (
          <CheckCircle2 size={16} color="#059669" />
        ) : (
          <AlertCircle size={16} color={isError ? '#DC2626' : isWarning ? '#D97706' : '#2563EB'} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
        {suggestion ? (
          <View style={styles.suggestionRow}>
            <HelpCircle size={11} color={subtextColor} />
            <Text style={[styles.suggestion, { color: subtextColor }]}>{suggestion}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  iconContainer: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  suggestion: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    flex: 1,
  },
});
